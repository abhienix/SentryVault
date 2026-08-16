#!/usr/bin/env python3
"""
SentryVault SOAR Automation Script
Connects to PostgreSQL sentry_security DB, processes Wazuh-style threat alerts,
and injects iptables block rules for active threat response.

Usage:
    python3 soc_automation.py [--test] [--block-ip <IP>] [--list-threats] [--list-blocked]
"""

import subprocess
import sys
import os
import json
import argparse
import logging
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Dependency bootstrap
# ---------------------------------------------------------------------------
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("[SOAR] psycopg2 not found. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"], stdout=subprocess.DEVNULL)
    import psycopg2
    from psycopg2.extras import RealDictCursor

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger("SOAR")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PG_HOST     = os.environ.get("PG_HOST",     "127.0.0.1")
PG_PORT     = int(os.environ.get("PG_PORT", "5432"))
PG_DB       = os.environ.get("PG_DB",       "sentry_security")
PG_USER     = os.environ.get("PG_USER",     "sentry_soc")
PG_PASS     = os.environ.get("PG_PASS",     "SocSecurityPass123!")

DMZ_SUBNET  = "192.168.10.0/24"

# ---------------------------------------------------------------------------
# PostgreSQL Helpers
# ---------------------------------------------------------------------------

def get_connection():
    """Return a psycopg2 connection to the sentry_security database."""
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASS,
        connect_timeout=5
    )


def test_db_connection():
    """Test PostgreSQL connectivity and write capability."""
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        log.info(f"[DB] Connected to PostgreSQL: {version}")

        # Write test
        cur.execute("""
            INSERT INTO soc_metrics (metric_name, metric_value, recorded_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (metric_name) DO UPDATE
              SET metric_value = EXCLUDED.metric_value,
                  recorded_at  = EXCLUDED.recorded_at
        """, ("connection_test", "OK", datetime.now(timezone.utc)))
        conn.commit()
        log.info("[DB] Write test successful (soc_metrics updated).")
        cur.close()
        conn.close()
        return True
    except Exception as exc:
        log.error(f"[DB] Connection/write test failed: {exc}")
        return False

# ---------------------------------------------------------------------------
# iptables Helpers
# ---------------------------------------------------------------------------

def ip_already_blocked(ip: str) -> bool:
    """Check if iptables already has a DROP rule for this IP."""
    try:
        result = subprocess.run(
            ["sudo", "iptables", "-L", "INPUT", "-n"],
            capture_output=True, text=True, timeout=10
        )
        return ip in result.stdout
    except Exception:
        return False


def block_ip(ip: str, reason: str = "SOAR Auto-Block") -> bool:
    """Insert iptables DROP rule for the given source IP."""
    if ip_already_blocked(ip):
        log.warning(f"[IPTABLES] {ip} is already blocked. Skipping.")
        return True

    try:
        # Drop all incoming packets from the threat IP
        subprocess.run(
            ["sudo", "iptables", "-I", "INPUT", "1",
             "-s", ip, "-j", "DROP", "-m", "comment",
             "--comment", f"SOAR:{reason[:60]}"],
            check=True, capture_output=True, timeout=10
        )
        log.info(f"[IPTABLES] Blocked {ip} — Reason: {reason}")
        return True
    except subprocess.CalledProcessError as exc:
        log.error(f"[IPTABLES] Failed to block {ip}: {exc.stderr.decode()}")
        return False


def unblock_ip(ip: str) -> bool:
    """Remove iptables DROP rule for the given source IP."""
    try:
        subprocess.run(
            ["sudo", "iptables", "-D", "INPUT",
             "-s", ip, "-j", "DROP"],
            check=True, capture_output=True, timeout=10
        )
        log.info(f"[IPTABLES] Unblocked {ip}")
        return True
    except subprocess.CalledProcessError as exc:
        log.warning(f"[IPTABLES] Could not remove rule for {ip}: {exc.stderr.decode()}")
        return False

# ---------------------------------------------------------------------------
# SOAR Event Processing
# ---------------------------------------------------------------------------

def record_threat_event(conn, alert: dict):
    """Persist a threat event to PostgreSQL."""
    cur = conn.cursor()
    src_ip = alert.get("source_ip") or alert.get("data", {}).get("srcip", "unknown")
    threat_type = alert.get("threat_type") or alert.get("rule", {}).get("description", "UNKNOWN")
    severity_val = alert.get("severity") or ("HIGH" if alert.get("rule", {}).get("level", 0) >= 8 else "MEDIUM")

    cur.execute("""
        INSERT INTO threat_events
            (source_ip, threat_type, severity, description, timestamp, raw_alert, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        src_ip,
        threat_type,
        severity_val if severity_val in ("LOW", "MEDIUM", "HIGH", "CRITICAL") else "MEDIUM",
        alert.get("description", threat_type),
        alert.get("timestamp", datetime.now(timezone.utc)),
        json.dumps(alert),
        "DETECTED"
    ))
    event_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    log.info(f"[SOAR] Threat event recorded — ID: {event_id}")
    return event_id


def record_blocked_ip(conn, ip: str, reason: str, event_id: int = None):
    """Persist a blocked IP to the blocked_ips table."""
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO blocked_ips (ip_address, reason, blocked_at, threat_event_id, active)
        VALUES (%s, %s, %s, %s, TRUE)
        ON CONFLICT (ip_address) DO UPDATE
          SET reason            = EXCLUDED.reason,
              blocked_at        = EXCLUDED.blocked_at,
              threat_event_id   = EXCLUDED.threat_event_id,
              active            = TRUE
    """, (ip, reason, datetime.now(timezone.utc), event_id))
    conn.commit()
    cur.close()
    log.info(f"[SOAR] Blocked IP persisted: {ip}")


def update_metric(conn, name: str, value: str):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO soc_metrics (metric_name, metric_value, recorded_at)
        VALUES (%s, %s, %s)
        ON CONFLICT (metric_name) DO UPDATE
          SET metric_value = EXCLUDED.metric_value,
              recorded_at  = EXCLUDED.recorded_at
    """, (name, value, datetime.now(timezone.utc)))
    conn.commit()
    cur.close()


def process_wazuh_alert(alert_json: str):
    """
    Parse a Wazuh-format JSON alert and apply SOAR response.
    Trigger iptables block for HIGH/CRITICAL severity threats.
    """
    try:
        alert = json.loads(alert_json)
    except json.JSONDecodeError as exc:
        log.error(f"[SOAR] Invalid JSON alert: {exc}")
        return

    source_ip   = alert.get("data", {}).get("srcip") or alert.get("source_ip", "unknown")
    severity    = alert.get("rule", {}).get("level", 3)
    description = alert.get("rule", {}).get("description", "Unknown threat")
    threat_type = alert.get("rule", {}).get("groups", ["UNKNOWN"])[0] if isinstance(alert.get("rule", {}).get("groups"), list) else "UNKNOWN"

    # Map Wazuh level to severity string
    if isinstance(severity, int):
        if severity >= 12:
            sev_str = "CRITICAL"
        elif severity >= 8:
            sev_str = "HIGH"
        elif severity >= 5:
            sev_str = "MEDIUM"
        else:
            sev_str = "LOW"
    else:
        sev_str = str(severity).upper()

    log.info(f"[SOAR] Alert received — IP: {source_ip} | Severity: {sev_str} | Type: {threat_type}")

    structured = {
        "source_ip":   source_ip,
        "threat_type": threat_type,
        "severity":    sev_str,
        "description": description,
        "timestamp":   datetime.now(timezone.utc),
    }

    try:
        conn     = get_connection()
        event_id = record_threat_event(conn, structured)

        # Auto-block HIGH and CRITICAL threats
        if sev_str in ("HIGH", "CRITICAL") and source_ip not in ("unknown", "127.0.0.1"):
            blocked = block_ip(source_ip, reason=f"{threat_type}: {description[:60]}")
            if blocked:
                record_blocked_ip(conn, source_ip, description, event_id)
                update_metric(conn, "last_blocked_ip", source_ip)

        update_metric(conn, "last_alert_processed", datetime.now(timezone.utc).isoformat())
        conn.close()

    except Exception as exc:
        log.error(f"[SOAR] Database operation failed: {exc}")


def list_threats(limit: int = 20):
    """Print the most recent threat events from PostgreSQL."""
    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT id, source_ip, threat_type, severity, description, timestamp, status
            FROM threat_events
            ORDER BY timestamp DESC
            LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            print("[SOAR] No threat events recorded yet.")
            return

        print(f"\n{'─'*80}")
        print(f"{'ID':>4}  {'Source IP':<18} {'Type':<20} {'Sev':<10} {'Status':<12} Description")
        print(f"{'─'*80}")
        for r in rows:
            desc = (r["description"] or "")[:40]
            print(f"{r['id']:>4}  {r['source_ip']:<18} {r['threat_type']:<20} {r['severity']:<10} {r['status']:<12} {desc}")
        print(f"{'─'*80}\n")

    except Exception as exc:
        log.error(f"[SOAR] Failed to list threats: {exc}")


def list_blocked():
    """Print all currently blocked IPs."""
    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT ip_address, reason, blocked_at, active
            FROM blocked_ips
            WHERE active = TRUE
            ORDER BY blocked_at DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            print("[SOAR] No IPs currently blocked.")
            return

        print(f"\n{'─'*70}")
        print(f"{'IP Address':<20} {'Blocked At':<26} Reason")
        print(f"{'─'*70}")
        for r in rows:
            print(f"{r['ip_address']:<20} {str(r['blocked_at']):<26} {(r['reason'] or '')[:40]}")
        print(f"{'─'*70}\n")

    except Exception as exc:
        log.error(f"[SOAR] Failed to list blocked IPs: {exc}")


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="SentryVault SOAR Automation — Threat Response & iptables Management"
    )
    parser.add_argument("--test",         action="store_true",   help="Test DB connectivity and write access")
    parser.add_argument("--block-ip",     metavar="IP",          help="Manually block an IP via iptables + DB")
    parser.add_argument("--unblock-ip",   metavar="IP",          help="Unblock a previously blocked IP")
    parser.add_argument("--alert",        metavar="JSON",        help="Process a raw Wazuh-format JSON alert string")
    parser.add_argument("--list-threats", action="store_true",   help="List recent threat events from DB")
    parser.add_argument("--list-blocked", action="store_true",   help="List currently blocked IPs from DB")

    args = parser.parse_args()

    if args.test:
        ok = test_db_connection()
        sys.exit(0 if ok else 1)

    if args.block_ip:
        try:
            conn = get_connection()
            threat = {
                "source_ip":   args.block_ip,
                "threat_type": "MANUAL_BLOCK",
                "severity":    "HIGH",
                "description": "Manually blocked via SOAR CLI",
                "timestamp":   datetime.now(timezone.utc),
            }
            event_id = record_threat_event(conn, threat)
            blocked  = block_ip(args.block_ip, reason="MANUAL_BLOCK")
            if blocked:
                record_blocked_ip(conn, args.block_ip, "Manually blocked via SOAR CLI", event_id)
            conn.close()
        except Exception as exc:
            log.error(f"[SOAR] Block-IP failed: {exc}")
            sys.exit(1)

    if args.unblock_ip:
        try:
            unblock_ip(args.unblock_ip)
            conn = get_connection()
            cur  = conn.cursor()
            cur.execute("UPDATE blocked_ips SET active = FALSE WHERE ip_address = %s", (args.unblock_ip,))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as exc:
            log.error(f"[SOAR] Unblock-IP failed: {exc}")
            sys.exit(1)

    if args.alert:
        process_wazuh_alert(args.alert)

    if args.list_threats:
        list_threats()

    if args.list_blocked:
        list_blocked()

    if not any(vars(args).values()):
        parser.print_help()


if __name__ == "__main__":
    main()
