#!/usr/bin/env python3
"""
Wazuh Active Response Block Script for SentryVault
Triggered by Wazuh Manager when a threat alert fires.
Reads alert from stdin (JSON) and calls iptables to block the source IP.
Logs to /var/ossec/logs/active-responses.log (Wazuh standard).

Deploy to: /var/ossec/active-response/bin/active_response_block.py
Make executable: chmod +x /var/ossec/active-response/bin/active_response_block.py
"""

import sys
import os
import json
import subprocess
import logging
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Logging (Wazuh active response log location)
# ---------------------------------------------------------------------------
AR_LOG = os.environ.get("AR_LOG", "/var/log/sentryvault/active_response.log")
os.makedirs(os.path.dirname(AR_LOG), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WAZUH-AR] %(message)s",
    handlers=[
        logging.FileHandler(AR_LOG, encoding="utf-8"),
        logging.StreamHandler(sys.stderr),
    ]
)
log = logging.getLogger("wazuh_ar")

# Whitelist — never block these (gateway, localhost, monitoring)
IP_WHITELIST = {
    "127.0.0.1",
    "192.168.20.1",   # Internal gateway
    "192.168.121.2",  # VMware NAT gateway
}

# Minimum Wazuh alert level to trigger a block
BLOCK_THRESHOLD_LEVEL = int(os.environ.get("BLOCK_THRESHOLD", "8"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_source_ip(alert: dict) -> str:
    """Extract source IP from Wazuh alert JSON (various schemas)."""
    # Try common Wazuh alert structures
    for path in [
        ["data", "srcip"],
        ["data", "src_ip"],
        ["data", "attacker_ip"],
        ["source_ip"],
    ]:
        obj = alert
        for key in path:
            obj = obj.get(key) if isinstance(obj, dict) else None
        if obj and isinstance(obj, str):
            return obj.strip()
    return ""


def is_already_blocked(ip: str) -> bool:
    try:
        result = subprocess.run(
            ["iptables", "-C", "INPUT", "-s", ip, "-j", "DROP"],
            capture_output=True, timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


def apply_block(ip: str, reason: str = "Wazuh Active Response") -> bool:
    """Insert an iptables DROP rule for the given source IP."""
    if is_already_blocked(ip):
        log.warning(f"IP {ip} already blocked. Skipping duplicate rule.")
        return True
    try:
        subprocess.run(
            ["iptables", "-I", "INPUT", "1",
             "-s", ip, "-j", "DROP",
             "-m", "comment", "--comment", f"WAZUH-AR:{reason[:50]}"],
            check=True, capture_output=True, timeout=10
        )
        log.info(f"BLOCKED {ip} — {reason}")
        return True
    except subprocess.CalledProcessError as exc:
        log.error(f"FAILED to block {ip}: {exc.stderr.decode()}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    """
    Entry point: read Wazuh alert JSON from stdin and block source IP if
    the alert severity meets the threshold.
    """
    raw = sys.stdin.read().strip()

    if not raw:
        log.error("No input received from Wazuh. Exiting.")
        sys.exit(1)

    try:
        alert = json.loads(raw)
    except json.JSONDecodeError as exc:
        log.error(f"Invalid JSON input: {exc}\nRaw: {raw[:200]}")
        sys.exit(1)

    log.info(f"Alert received: {json.dumps(alert)[:300]}")

    # Extract alert level
    alert_level = alert.get("rule", {}).get("level", 0)
    description = alert.get("rule", {}).get("description", "Unknown")
    source_ip   = get_source_ip(alert)

    log.info(f"Level={alert_level} | IP={source_ip} | Desc={description[:80]}")

    if not source_ip:
        log.warning("No source IP found in alert. No action taken.")
        sys.exit(0)

    if source_ip in IP_WHITELIST:
        log.warning(f"IP {source_ip} is whitelisted. Skipping block.")
        sys.exit(0)

    if alert_level < BLOCK_THRESHOLD_LEVEL:
        log.info(f"Alert level {alert_level} below threshold {BLOCK_THRESHOLD_LEVEL}. No block applied.")
        sys.exit(0)

    # Apply block
    reason = f"L{alert_level}:{description[:40]}"
    blocked = apply_block(source_ip, reason=reason)

    # Optionally notify SOAR automation
    soar_script = os.path.join(os.path.dirname(__file__), "..", "scripts", "soc_automation.py")
    soar_script = os.path.normpath(soar_script)
    if blocked and os.path.isfile(soar_script):
        try:
            subprocess.Popen(
                [sys.executable, soar_script, "--alert", raw],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            log.info("SOAR automation notified.")
        except Exception as exc:
            log.warning(f"Could not notify SOAR: {exc}")

    sys.exit(0 if blocked else 1)


if __name__ == "__main__":
    main()
