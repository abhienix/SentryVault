"""
SOC Command Center API Router
Prefix: /api/v1/soc
All endpoints require ADMIN JWT except /health-check (public) and /banking-kpis.
"""
import socket
import subprocess
import time
import re
import ipaddress
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from app.database.session import get_db
from app.database.soc_session import get_soc_db, check_soc_db_health
from app.auth.jwt import get_current_user
from app.models.models import User, Account, Transaction
from app.schemas.soc import (
    ThreatEventResponse,
    BlockedIPCreate,
    BlockedIPResponse,
    WAFAlertResponse,
    SystemHealthResponse,
    ServiceHealth,
    BankingKPIResponse,
)
from app.core.config import settings

router = APIRouter(prefix="/soc", tags=["Security Operations Center"])

SCRIPTS_DIR = "/home/sentry/SentryVault/scripts"


# ─── Dependency: admin-only guard ─────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    return current_user


# ─── Helpers ──────────────────────────────────────────────────────────────────

def validate_ip(ip: str) -> str:
    try:
        ipaddress.ip_address(ip.strip())
        return ip.strip()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid IP address: {ip}")


def tcp_check(host: str, port: int, timeout: float = 2.0) -> dict:
    try:
        t0 = time.monotonic()
        sock = socket.create_connection((host, port), timeout=timeout)
        sock.close()
        latency = round((time.monotonic() - t0) * 1000, 2)
        return {"connected": True, "latency_ms": latency}
    except Exception as e:
        return {"connected": False, "latency_ms": None, "error": str(e)[:80]}


def run_soar(args: list) -> dict:
    """Execute soc_automation.py subprocess, return stdout/stderr."""
    try:
        result = subprocess.run(
            ["python3", f"{SCRIPTS_DIR}/soc_automation.py"] + args,
            capture_output=True,
            text=True,
            timeout=15,
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "stdout": "", "stderr": "SOAR script timed out after 15s"}
    except Exception as e:
        return {"success": False, "stdout": "", "stderr": str(e)}


# ─── GET /soc/threats ─────────────────────────────────────────────────────────

@router.get("/threats", response_model=List[ThreatEventResponse])
def get_threat_events(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    severity: Optional[str] = Query(None, description="Filter: CRITICAL,HIGH,MEDIUM,LOW"),
    source_ip: Optional[str] = Query(None, description="Filter by partial IP"),
    threat_type: Optional[str] = Query(None),
    _admin: User = Depends(require_admin),
    soc_db: Session = Depends(get_soc_db),
):
    """Return paginated threat events from PostgreSQL sentry_security."""
    q = "SELECT id, source_ip, threat_type, severity, description, timestamp, raw_alert, status FROM threat_events"
    conditions, params = [], {}

    if severity:
        severity_list = [s.strip().upper() for s in severity.split(",")]
        conditions.append(f"severity = ANY(:severities)")
        params["severities"] = severity_list
    if source_ip:
        conditions.append("source_ip LIKE :source_ip")
        params["source_ip"] = f"%{source_ip}%"
    if threat_type:
        conditions.append("threat_type ILIKE :threat_type")
        params["threat_type"] = f"%{threat_type}%"

    if conditions:
        q += " WHERE " + " AND ".join(conditions)
    q += " ORDER BY timestamp DESC LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset

    rows = soc_db.execute(text(q), params).fetchall()
    return [
        ThreatEventResponse(
            id=r[0], source_ip=r[1], threat_type=r[2], severity=r[3],
            description=r[4], timestamp=r[5], raw_alert=r[6], status=r[7]
        )
        for r in rows
    ]


# ─── GET /soc/blocked-ips ─────────────────────────────────────────────────────

@router.get("/blocked-ips", response_model=List[BlockedIPResponse])
def get_blocked_ips(
    include_inactive: bool = Query(False),
    _admin: User = Depends(require_admin),
    soc_db: Session = Depends(get_soc_db),
):
    """Return blocked IP records from PostgreSQL."""
    q = """
        SELECT id, ip_address, reason, blocked_at, threat_event_id, active, block_source
        FROM blocked_ips
    """
    if not include_inactive:
        q += " WHERE active = TRUE"
    q += " ORDER BY blocked_at DESC"

    rows = soc_db.execute(text(q)).fetchall()
    return [
        BlockedIPResponse(
            id=r[0], ip_address=r[1], reason=r[2], blocked_at=r[3],
            threat_event_id=r[4], active=r[5], block_source=r[6]
        )
        for r in rows
    ]


# ─── POST /soc/block-ip ───────────────────────────────────────────────────────

@router.post("/block-ip", response_model=BlockedIPResponse)
def block_ip(
    payload: BlockedIPCreate,
    _admin: User = Depends(require_admin),
    soc_db: Session = Depends(get_soc_db),
):
    """Quarantine an IP: insert into DB + execute iptables block via SOAR."""
    ip = validate_ip(payload.ip_address)

    # Check if already actively blocked
    existing = soc_db.execute(
        text("SELECT id FROM blocked_ips WHERE ip_address = :ip AND active = TRUE"),
        {"ip": ip}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail=f"IP {ip} is already quarantined.")

    # Run SOAR automation (iptables + DB via soc_automation.py)
    soar_result = run_soar(["--block-ip", ip, "--reason", payload.reason])

    # Insert into PostgreSQL regardless (SOAR also inserts, but we ensure it)
    now = datetime.now(timezone.utc)
    soc_db.execute(
        text("""
            INSERT INTO blocked_ips (ip_address, reason, blocked_at, active, block_source)
            VALUES (:ip, :reason, :now, TRUE, 'SOC_DASHBOARD')
            ON CONFLICT (ip_address) DO UPDATE
            SET active = TRUE, reason = :reason, blocked_at = :now, block_source = 'SOC_DASHBOARD'
        """),
        {"ip": ip, "reason": payload.reason, "now": now}
    )
    soc_db.commit()

    row = soc_db.execute(
        text("SELECT id, ip_address, reason, blocked_at, threat_event_id, active, block_source FROM blocked_ips WHERE ip_address = :ip"),
        {"ip": ip}
    ).fetchone()
    return BlockedIPResponse(
        id=row[0], ip_address=row[1], reason=row[2], blocked_at=row[3],
        threat_event_id=row[4], active=row[5], block_source=row[6]
    )


# ─── POST /soc/unblock-ip ─────────────────────────────────────────────────────

@router.post("/unblock-ip")
def unblock_ip(
    payload: BlockedIPCreate,
    _admin: User = Depends(require_admin),
    soc_db: Session = Depends(get_soc_db),
):
    """Remove IP from quarantine: update DB + execute iptables unblock."""
    ip = validate_ip(payload.ip_address)

    row = soc_db.execute(
        text("SELECT id FROM blocked_ips WHERE ip_address = :ip AND active = TRUE"),
        {"ip": ip}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"IP {ip} not found in active quarantine.")

    # Run SOAR unblock
    run_soar(["--unblock-ip", ip])

    # Update DB
    soc_db.execute(
        text("UPDATE blocked_ips SET active = FALSE WHERE ip_address = :ip"),
        {"ip": ip}
    )
    soc_db.commit()

    return {"success": True, "message": f"IP {ip} removed from quarantine.", "ip_address": ip}


# ─── GET /soc/waf-alerts ──────────────────────────────────────────────────────

@router.get("/waf-alerts", response_model=List[WAFAlertResponse])
def get_waf_alerts(
    limit: int = Query(50, ge=1, le=200),
    blocked_only: bool = Query(False),
    _admin: User = Depends(require_admin),
    soc_db: Session = Depends(get_soc_db),
):
    """Return recent WAF alert records from PostgreSQL."""
    q = """
        SELECT id, source_ip, target_url, attack_type, payload,
               http_method, response_code, severity, detected_at, blocked
        FROM waf_alerts
    """
    if blocked_only:
        q += " WHERE blocked = TRUE"
    q += " ORDER BY detected_at DESC LIMIT :limit"

    rows = soc_db.execute(text(q), {"limit": limit}).fetchall()
    return [
        WAFAlertResponse(
            id=r[0], source_ip=r[1], target_url=r[2], attack_type=r[3],
            payload=r[4], http_method=r[5], response_code=r[6],
            severity=r[7], detected_at=r[8], blocked=r[9]
        )
        for r in rows
    ]


def ping_check(host: str, timeout: float = 2.0) -> dict:
    """Fallback ICMP ping check if TCP port is unreachable."""
    try:
        t0 = time.monotonic()
        res = subprocess.run(
            ["ping", "-c", "1", "-w", "2", host],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        latency = round((time.monotonic() - t0) * 1000, 2)
        if res.returncode == 0:
            return {"connected": True, "latency_ms": latency}
    except Exception as e:
        pass
    return {"connected": False, "latency_ms": None, "error": "Host unreachable"}


# ─── GET /soc/health-check ────────────────────────────────────────────────────

@router.get("/health-check", response_model=SystemHealthResponse)
def system_health_check():
    """Public endpoint: TCP socket & ping checks for all infrastructure services."""
    dmz_res = tcp_check("192.168.10.10", 8000)
    if not dmz_res.get("connected"):
        # Fallback to ICMP ping check to DMZ Host
        dmz_res = ping_check("192.168.10.10")

    checks = [
        ("MySQL DB",        tcp_check("127.0.0.1", 3306)),
        ("PostgreSQL SOC",  check_soc_db_health()),
        ("Wazuh Manager",   tcp_check("127.0.0.1", 55000)),
        ("Internal Host",   tcp_check("192.168.20.10", 8000)),
        ("DMZ Host",        dmz_res),
    ]

    services = [
        ServiceHealth(
            name=name,
            connected=result.get("connected", False),
            latency_ms=result.get("latency_ms"),
            error=result.get("error"),
        )
        for name, result in checks
    ]

    connected_count = sum(1 for s in services if s.connected)
    if connected_count == len(services):
        overall = "ALL_GREEN"
    elif connected_count >= 3:
        overall = "DEGRADED"
    else:
        overall = "CRITICAL"

    return SystemHealthResponse(
        timestamp=datetime.now(timezone.utc),
        overall_status=overall,
        services=services,
    )


# ─── GET /soc/banking-kpis ────────────────────────────────────────────────────

@router.get("/banking-kpis", response_model=BankingKPIResponse)
def get_banking_kpis(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    soc_db: Session = Depends(get_soc_db),
):
    """Unified KPIs: MySQL banking metrics + PostgreSQL SOC threat counts."""
    from app.models.models import User as UserModel, Account, Transaction

    total_deposits = db.execute(text("SELECT COALESCE(SUM(balance),0) FROM accounts")).scalar() or 0.0
    total_accounts = db.execute(text("SELECT COUNT(*) FROM accounts")).scalar() or 0
    total_users = db.execute(text("SELECT COUNT(*) FROM users WHERE role='CUSTOMER'")).scalar() or 0
    active_accounts = db.execute(text("SELECT COUNT(*) FROM accounts WHERE status='ACTIVE'")).scalar() or 0
    total_transactions = db.execute(text("SELECT COUNT(*) FROM transactions")).scalar() or 0

    # Transactions in last 24h
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    txn_24h = db.execute(
        text("SELECT COUNT(*) FROM transactions WHERE created_at >= :cutoff"),
        {"cutoff": cutoff}
    ).scalar() or 0

    # SOC threat counts from PostgreSQL
    try:
        threat_total = soc_db.execute(text("SELECT COUNT(*) FROM threat_events")).scalar() or 0
        active_blocked = soc_db.execute(text("SELECT COUNT(*) FROM blocked_ips WHERE active=TRUE")).scalar() or 0
    except Exception:
        threat_total = 0
        active_blocked = 0

    return BankingKPIResponse(
        total_deposits=round(float(total_deposits), 2),
        total_accounts=int(total_accounts),
        total_users=int(total_users),
        active_accounts=int(active_accounts),
        transactions_24h=int(txn_24h),
        total_transactions=int(total_transactions),
        threat_events_total=int(threat_total),
        active_blocked_ips=int(active_blocked),
    )
