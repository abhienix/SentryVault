"""
Pydantic schemas for the Security Operations Center (SOC) API.
All models map to PostgreSQL sentry_security tables.
"""
from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, IPvAnyAddress


# ─── Threat Events ────────────────────────────────────────────────────────────

class ThreatEventResponse(BaseModel):
    id: int
    source_ip: str
    threat_type: str
    severity: str
    description: Optional[str] = None
    timestamp: datetime
    raw_alert: Optional[Any] = None
    status: str

    class Config:
        from_attributes = True


# ─── Blocked IPs ──────────────────────────────────────────────────────────────

class BlockedIPCreate(BaseModel):
    ip_address: str
    reason: str = "Manually quarantined via SOC Dashboard"


class BlockedIPResponse(BaseModel):
    id: int
    ip_address: str
    reason: Optional[str] = None
    blocked_at: datetime
    threat_event_id: Optional[int] = None
    active: bool
    block_source: Optional[str] = "SOAR"

    class Config:
        from_attributes = True


# ─── WAF Alerts ───────────────────────────────────────────────────────────────

class WAFAlertResponse(BaseModel):
    id: int
    source_ip: str
    target_url: Optional[str] = None
    attack_type: str
    payload: Optional[str] = None
    http_method: Optional[str] = None
    response_code: Optional[int] = None
    severity: str
    detected_at: datetime
    blocked: bool

    class Config:
        from_attributes = True


# ─── System Health ────────────────────────────────────────────────────────────

class ServiceHealth(BaseModel):
    name: str
    connected: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class SystemHealthResponse(BaseModel):
    timestamp: datetime
    overall_status: str          # "ALL_GREEN" | "DEGRADED" | "CRITICAL"
    services: List[ServiceHealth]


# ─── Banking KPIs (from MySQL) ────────────────────────────────────────────────

class BankingKPIResponse(BaseModel):
    total_deposits: float
    total_accounts: int
    total_users: int
    active_accounts: int
    transactions_24h: int
    total_transactions: int
    threat_events_total: int
    active_blocked_ips: int
