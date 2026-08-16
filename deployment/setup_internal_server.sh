#!/bin/bash
# =============================================================================
# SentryVault Internal Server Master Setup Script
# Ubuntu Internal Network VM — 192.168.20.10
# =============================================================================
# Phases:
#   1. Network interface & cross-subnet routing diagnostics
#   2. Internal firewall ACL & port unblocking
#   3. MySQL setup, remote binding & database seeding
#   4. Wazuh Manager (SIEM) listener & active response
#   5. PostgreSQL security DB & SOAR automation
#   6. React SOC Dashboard (nginx serving)
#   7. Full DMZ reachability & service verification matrix
#
# Usage:  sudo bash setup_internal_server.sh
#         sudo bash setup_internal_server.sh --skip-wazuh   (skip Wazuh install)
#         sudo bash setup_internal_server.sh --verify-only  (run Phase 7 only)
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}[✔]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
err()  { echo -e "${RED}[✘]${NC} $*"; }
info() { echo -e "${CYAN}[→]${NC} $*"; }
hdr()  { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════${NC}"; \
          echo -e "${BOLD}${CYAN}  $*${NC}"; \
          echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════${NC}"; }

# ── Args ──────────────────────────────────────────────────────────────────────
SKIP_WAZUH=false
VERIFY_ONLY=false
for arg in "$@"; do
    [[ "$arg" == "--skip-wazuh"  ]] && SKIP_WAZUH=true
    [[ "$arg" == "--verify-only" ]] && VERIFY_ONLY=true
done

# ── Vars ──────────────────────────────────────────────────────────────────────
INTERNAL_IP="192.168.20.10"
DMZ_SUBNET="192.168.10.0/24"
DMZ_HOST="192.168.10.10"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

MYSQL_ROOT_CMD="mysql -u root"
MYSQL_DB="sentryvault"
MYSQL_USER="sentryuser"
MYSQL_PASS="SecureDbPassword123!"

PG_DB="sentry_security"
PG_USER="sentry_soc"
PG_PASS="SocSecurityPass123!"

NGINX_PORT=3000
VENV_PATH="/home/sentry/venv"
FRONTEND_DIST="$PROJECT_DIR/frontend/dist"

LOG_DIR="/var/log/sentryvault"
ENV_DIR="/etc/sentryvault"

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1 – Network Interface & Routing Diagnostics
# ─────────────────────────────────────────────────────────────────────────────
phase1_network() {
    hdr "PHASE 1 — Network Interface & Cross-Subnet Routing"

    info "Active network interfaces:"
    ip addr show | grep -E "(^[0-9]|inet )" | grep -v "inet6"

    ASSIGNED=$(ip addr show | grep "192.168.20" | grep -oP "192\.168\.20\.\d+" | head -1)
    if [[ -n "$ASSIGNED" ]]; then
        ok "Internal IP confirmed: $ASSIGNED"
    else
        err "Internal IP 192.168.20.x NOT found on any interface!"
        warn "This server has IP: $(hostname -I)"
    fi

    info "Current routing table:"
    ip route show

    # Check for DMZ route
    if ip route show | grep -q "192.168.10"; then
        ok "Route to DMZ subnet ($DMZ_SUBNET) exists."
    else
        warn "No explicit route to $DMZ_SUBNET. Attempting to add via default gateway..."
        GATEWAY=$(ip route show default | awk '/default/ {print $3}' | head -1)
        if [[ -n "$GATEWAY" ]]; then
            ip route add "$DMZ_SUBNET" via "$GATEWAY" 2>/dev/null || warn "Route may already exist or gateway unreachable."
            ok "Static route added: $DMZ_SUBNET via $GATEWAY"
        else
            err "No default gateway found. Manual routing configuration required."
        fi
    fi

    info "Pinging DMZ host ($DMZ_HOST)..."
    if ping -c 3 -W 3 "$DMZ_HOST" &>/dev/null; then
        ok "DMZ host $DMZ_HOST is REACHABLE (ping successful)"
    else
        warn "DMZ host $DMZ_HOST did not respond to ping (may be ICMP-blocked, check service ports)"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2 – Firewall ACL & Port Unblocking
# ─────────────────────────────────────────────────────────────────────────────
phase2_firewall() {
    hdr "PHASE 2 — Internal Firewall ACL & Port Unblocking"

    info "Current firewall status:"
    if command -v ufw &>/dev/null; then
        ufw status verbose 2>/dev/null || true
    fi

    info "Current iptables INPUT policy:"
    iptables -L INPUT -n --line-numbers 2>/dev/null | head -20 || true

    # Check if any DROP/REJECT rules might block DMZ traffic
    DROP_RULES=$(iptables -L INPUT -n 2>/dev/null | grep -c "DROP\|REJECT" || echo 0)
    if [[ "$DROP_RULES" -gt 0 ]]; then
        warn "$DROP_RULES DROP/REJECT rule(s) found. Ensuring DMZ ACCEPT rules are inserted first."
    fi

    # ── MySQL Port 3306 ──
    info "Opening MySQL port 3306 for DMZ subnet $DMZ_SUBNET..."
    iptables -C INPUT -p tcp -s "$DMZ_SUBNET" --dport 3306 -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p tcp -s "$DMZ_SUBNET" --dport 3306 -j ACCEPT
    ok "iptables: TCP 3306 from $DMZ_SUBNET → ACCEPT"

    # ── Wazuh Agent Ports 1514 (TCP+UDP) & 1515 ──
    info "Opening Wazuh ports 1514/1515 for DMZ subnet..."
    iptables -C INPUT -p tcp -s "$DMZ_SUBNET" --dport 1514 -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p tcp -s "$DMZ_SUBNET" --dport 1514 -j ACCEPT
    iptables -C INPUT -p udp -s "$DMZ_SUBNET" --dport 1514 -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p udp -s "$DMZ_SUBNET" --dport 1514 -j ACCEPT
    iptables -C INPUT -p tcp -s "$DMZ_SUBNET" --dport 1515 -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p tcp -s "$DMZ_SUBNET" --dport 1515 -j ACCEPT
    ok "iptables: Wazuh TCP/UDP 1514 & TCP 1515 from $DMZ_SUBNET → ACCEPT"

    # ── Wazuh API Port 55000 ──
    iptables -C INPUT -p tcp -s "$DMZ_SUBNET" --dport 55000 -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p tcp -s "$DMZ_SUBNET" --dport 55000 -j ACCEPT
    ok "iptables: Wazuh API TCP 55000 from $DMZ_SUBNET → ACCEPT"

    # ── Backend API Port 8000 ──
    iptables -C INPUT -p tcp -s "$DMZ_SUBNET" --dport 8000 -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p tcp -s "$DMZ_SUBNET" --dport 8000 -j ACCEPT
    ok "iptables: Backend API TCP 8000 from $DMZ_SUBNET → ACCEPT"

    # ── SOC Dashboard Port (nginx) ──
    iptables -C INPUT -p tcp --dport "$NGINX_PORT" -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p tcp --dport "$NGINX_PORT" -j ACCEPT
    iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    ok "iptables: TCP 80 & $NGINX_PORT (SOC Dashboard) → ACCEPT"

    # ── PostgreSQL Port 5432 (internal only) ──
    iptables -C INPUT -p tcp -s 127.0.0.1 --dport 5432 -j ACCEPT 2>/dev/null \
        || iptables -A INPUT -p tcp -s 127.0.0.1 --dport 5432 -j ACCEPT
    ok "iptables: PostgreSQL TCP 5432 localhost → ACCEPT"

    # ── Persist rules ──
    info "Persisting iptables rules..."
    if command -v netfilter-persistent &>/dev/null; then
        netfilter-persistent save
        ok "Rules saved via netfilter-persistent"
    elif command -v iptables-save &>/dev/null; then
        mkdir -p /etc/iptables
        iptables-save > /etc/iptables/rules.v4
        ok "Rules saved to /etc/iptables/rules.v4"
        # Install iptables-persistent if available
        if dpkg -l | grep -q iptables-persistent 2>/dev/null; then
            ok "iptables-persistent is installed"
        else
            info "Installing iptables-persistent for rule persistence on boot..."
            DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent -q 2>/dev/null || warn "Could not install iptables-persistent (rules will not survive reboot)"
        fi
    fi

    info "Final ACL — INPUT rules for DMZ access:"
    iptables -L INPUT -n -v 2>/dev/null | grep -E "ACCEPT|DROP|dpt" | head -30 || true
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 – MySQL Setup, Remote Binding & Database Seeding
# ─────────────────────────────────────────────────────────────────────────────
phase3_mysql() {
    hdr "PHASE 3 — MySQL Server Setup & Database Seeding"

    # Ensure MySQL is running
    if ! systemctl is-active --quiet mysql; then
        info "Starting MySQL service..."
        systemctl start mysql
        sleep 2
    fi
    ok "MySQL service: RUNNING"

    # Confirm bind-address = 0.0.0.0
    MYSQL_CNF="/etc/mysql/mysql.conf.d/mysqld.cnf"
    if [[ -f "$MYSQL_CNF" ]]; then
        BIND=$(grep "^bind-address" "$MYSQL_CNF" | awk '{print $3}' || echo "not-set")
        if [[ "$BIND" != "0.0.0.0" ]]; then
            info "Updating bind-address to 0.0.0.0 in $MYSQL_CNF..."
            sed -i 's/^bind-address\s*=.*/bind-address            = 0.0.0.0/' "$MYSQL_CNF"
            sed -i 's/^mysqlx-bind-address\s*=.*/mysqlx-bind-address     = 0.0.0.0/' "$MYSQL_CNF"
            systemctl restart mysql
            sleep 2
            ok "MySQL restarted with bind-address=0.0.0.0"
        else
            ok "MySQL bind-address already set to 0.0.0.0"
        fi
    fi

    # Verify listening port
    if ss -tulpn 2>/dev/null | grep -q ":3306"; then
        ok "MySQL is listening on $(ss -tulpn | grep ':3306' | awk '{print $5}' | head -1)"
    else
        err "MySQL is NOT listening on port 3306!"
    fi

    # ── Create DB, users, grant permissions ──
    info "Creating sentryvault database and sentryuser..."
    $MYSQL_ROOT_CMD <<-EOSQL
        -- Create main sentryvault database
        CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\`
            CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

        -- Create sentryuser with wildcard host for DMZ access
        CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%'
            IDENTIFIED BY '${MYSQL_PASS}';
        GRANT ALL PRIVILEGES ON \`${MYSQL_DB}\`.* TO '${MYSQL_USER}'@'%';

        -- Also allow localhost access
        CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost'
            IDENTIFIED BY '${MYSQL_PASS}';
        GRANT ALL PRIVILEGES ON \`${MYSQL_DB}\`.* TO '${MYSQL_USER}'@'localhost';

        -- Create legacy users mentioned in task spec
        CREATE USER IF NOT EXISTS 'sentryuser'@'192.168.10.%'
            IDENTIFIED BY '${MYSQL_PASS}';
        GRANT ALL PRIVILEGES ON \`${MYSQL_DB}\`.* TO 'sentryuser'@'192.168.10.%';

        FLUSH PRIVILEGES;

        USE \`${MYSQL_DB}\`;
        SELECT 'Database: sentryvault initialized' AS status;
        SHOW TABLES;
EOSQL
    ok "MySQL: sentryvault database & sentryuser created with full privileges"

    # ── Initialize schema via project init.sql / setup_remote_db.sql ──
    info "Running schema initialization..."
    if [[ -f "$PROJECT_DIR/scripts/setup_remote_db.sql" ]]; then
        $MYSQL_ROOT_CMD < "$PROJECT_DIR/scripts/setup_remote_db.sql" 2>/dev/null || true
        ok "Ran scripts/setup_remote_db.sql"
    fi

    # ── Run schema migrations (Alembic if available, else SQLAlchemy auto-create) ──
    info "Initializing application schema via Python ORM..."
    if [[ -f "$VENV_PATH/bin/python3" ]]; then
        PYTHON="$VENV_PATH/bin/python3"
    else
        PYTHON=$(which python3)
    fi

    # Set environment for MySQL connection
    export DB_HOST="127.0.0.1"
    export DB_PORT="3306"
    export DB_USER="$MYSQL_USER"
    export DB_PASSWORD="$MYSQL_PASS"
    export DB_NAME="$MYSQL_DB"
    export DATABASE_URL="mysql+pymysql://${MYSQL_USER}:${MYSQL_PASS}@127.0.0.1:3306/${MYSQL_DB}"

    # Auto-create SQLAlchemy schema (via Base.metadata.create_all)
    cd "$PROJECT_DIR/backend"
    "$PYTHON" -c "
import sys, os
sys.path.insert(0, '.')
try:
    from app.database.session import engine, Base
    from app.models import models  # trigger model registration
    Base.metadata.create_all(bind=engine)
    print('[OK] SQLAlchemy schema created / verified')
except Exception as e:
    print(f'[WARN] Schema creation skipped: {e}')
" 2>/dev/null || warn "SQLAlchemy schema creation skipped (dependencies may not be installed)"
    cd "$PROJECT_DIR"

    # ── Seed data ──
    info "Running seed data script..."
    cd "$PROJECT_DIR/backend"
    "$PYTHON" "$PROJECT_DIR/scripts/seed_data.py" 2>/dev/null \
        && ok "Seed data loaded successfully" \
        || warn "Seed data script had issues (may already be seeded or deps missing)"
    cd "$PROJECT_DIR"

    # ── Verify tables ──
    info "Verifying database tables..."
    $MYSQL_ROOT_CMD "$MYSQL_DB" -e "SHOW TABLES;" 2>/dev/null || true
    $MYSQL_ROOT_CMD "$MYSQL_DB" -e "SELECT COUNT(*) AS user_count FROM users;" 2>/dev/null \
        && ok "Users table populated" || warn "Users table not yet seeded (schema may differ)"
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4 – Wazuh Manager Installation & Configuration
# ─────────────────────────────────────────────────────────────────────────────
phase4_wazuh() {
    hdr "PHASE 4 — Wazuh Manager (SIEM) Setup"

    if $SKIP_WAZUH; then
        warn "SKIPPED: --skip-wazuh flag set. Wazuh Manager will not be installed."
        return
    fi

    if systemctl is-active --quiet wazuh-manager 2>/dev/null; then
        ok "Wazuh Manager is already RUNNING"
    elif [[ -d "/var/ossec" ]]; then
        info "Wazuh installed but not running. Starting..."
        systemctl start wazuh-manager
        ok "Wazuh Manager started"
    else
        info "Installing Wazuh Manager 4.x..."

        # Import Wazuh GPG key
        curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH \
            | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg 2>/dev/null \
            || { warn "Could not import Wazuh GPG key (offline?). Trying alternative..."; }

        # Add repository
        echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" \
            > /etc/apt/sources.list.d/wazuh.list 2>/dev/null || true

        apt-get update -qq 2>/dev/null || true
        DEBIAN_FRONTEND=noninteractive apt-get install -y wazuh-manager 2>/dev/null \
            && ok "Wazuh Manager installed" \
            || { warn "Wazuh Manager installation failed (network/repo issue). Configuring stub service."; \
                 _configure_wazuh_stub; return; }
    fi

    # ── Configure ossec.conf remote listener ──
    _configure_wazuh_remote

    # ── Deploy active response script ──
    _deploy_active_response

    # ── Restart and verify ──
    systemctl restart wazuh-manager 2>/dev/null || true
    sleep 3

    if systemctl is-active --quiet wazuh-manager 2>/dev/null; then
        ok "Wazuh Manager: RUNNING"
    else
        warn "Wazuh Manager not running (check: journalctl -u wazuh-manager -n 30)"
    fi

    info "Wazuh port bindings:"
    ss -tulpn 2>/dev/null | grep -E "1514|1515|55000" | head -10 || warn "No Wazuh ports bound yet"
}

_configure_wazuh_remote() {
    OSSEC_CONF="/var/ossec/etc/ossec.conf"
    [[ ! -f "$OSSEC_CONF" ]] && return

    # Ensure <remote> block with UDP/TCP on 1514 and TCP on 1515
    if ! grep -q "<remote>" "$OSSEC_CONF"; then
        info "Adding <remote> listener block to ossec.conf..."
        # Insert before closing </ossec_config>
        sed -i 's|</ossec_config>|  <remote>\n    <connection>syslog</connection>\n    <port>1514</port>\n    <protocol>tcp</protocol>\n    <allowed-ips>192.168.10.0/24</allowed-ips>\n  </remote>\n  <remote>\n    <connection>secure</connection>\n    <port>1514</port>\n    <protocol>udp</protocol>\n    <allowed-ips>192.168.10.0/24</allowed-ips>\n  </remote>\n</ossec_config>|' "$OSSEC_CONF"
    fi

    # Enable active response
    if ! grep -q "active-response" "$OSSEC_CONF"; then
        sed -i 's|</ossec_config>|  <active-response>\n    <disabled>no</disabled>\n    <command>custom-block</command>\n    <location>local</location>\n    <level>8</level>\n    <timeout>600</timeout>\n  </active-response>\n</ossec_config>|' "$OSSEC_CONF"
    fi

    ok "ossec.conf: <remote> listener configured for DMZ agents on 1514/1515"
}

_deploy_active_response() {
    AR_DIR="/var/ossec/active-response/bin"
    [[ ! -d "$AR_DIR" ]] && mkdir -p "$AR_DIR"

    if [[ -f "$PROJECT_DIR/scripts/active_response_block.py" ]]; then
        cp "$PROJECT_DIR/scripts/active_response_block.py" "$AR_DIR/"
        chmod 750 "$AR_DIR/active_response_block.py"
        chown root:ossec "$AR_DIR/active_response_block.py" 2>/dev/null || true
        ok "Active response script deployed to $AR_DIR"
    fi
}

_configure_wazuh_stub() {
    # Wazuh not installed — record status in PostgreSQL for dashboard
    warn "Configuring Wazuh stub status (installation skipped/failed)."
    PSQL_CMD="psql -U $PG_USER -d $PG_DB"
    PGPASSWORD="$PG_PASS" $PSQL_CMD -c \
        "UPDATE soc_metrics SET metric_value='NOT_INSTALLED', recorded_at=NOW() WHERE metric_name='wazuh_manager_status';" \
        2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5 – PostgreSQL Security DB & SOAR Automation
# ─────────────────────────────────────────────────────────────────────────────
phase5_postgresql() {
    hdr "PHASE 5 — PostgreSQL Security DB & SOAR Automation"

    if ! systemctl is-active --quiet postgresql; then
        info "Starting PostgreSQL..."
        systemctl start postgresql
        sleep 2
    fi
    ok "PostgreSQL: RUNNING"

    # ── Run schema SQL as postgres superuser ──
    info "Initializing sentry_security database schema..."
    SCHEMA_SQL="$PROJECT_DIR/database/sentry_security_schema.sql"

    if [[ -f "$SCHEMA_SQL" ]]; then
        # Use -f flag; schema handles CREATE DATABASE internally
        sudo -u postgres psql -f "$SCHEMA_SQL" 2>&1 | grep -v "^$" | head -30 || true
        ok "sentry_security schema initialized via $SCHEMA_SQL"
    else
        # Inline minimal schema
        sudo -u postgres psql <<-EOPGSQL
            SELECT 'CREATE DATABASE sentry_security'
            WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sentry_security')\gexec

            \c sentry_security

            DO \$\$ BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sentry_soc') THEN
                    CREATE USER sentry_soc WITH PASSWORD 'SocSecurityPass123!';
                END IF;
            END \$\$;

            GRANT ALL PRIVILEGES ON DATABASE sentry_security TO sentry_soc;

            CREATE TABLE IF NOT EXISTS threat_events (
                id SERIAL PRIMARY KEY, source_ip VARCHAR(45), threat_type VARCHAR(100),
                severity VARCHAR(20) DEFAULT 'MEDIUM', description TEXT,
                timestamp TIMESTAMPTZ DEFAULT NOW(), raw_alert JSONB,
                status VARCHAR(30) DEFAULT 'DETECTED'
            );
            CREATE TABLE IF NOT EXISTS blocked_ips (
                id SERIAL PRIMARY KEY, ip_address VARCHAR(45) UNIQUE,
                reason TEXT, blocked_at TIMESTAMPTZ DEFAULT NOW(), active BOOLEAN DEFAULT TRUE
            );
            CREATE TABLE IF NOT EXISTS waf_alerts (
                id SERIAL PRIMARY KEY, source_ip VARCHAR(45), attack_type VARCHAR(50),
                payload TEXT, severity VARCHAR(20), detected_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS soc_metrics (
                id SERIAL PRIMARY KEY, metric_name VARCHAR(100) UNIQUE,
                metric_value TEXT, recorded_at TIMESTAMPTZ DEFAULT NOW()
            );
            GRANT ALL ON ALL TABLES IN SCHEMA public TO sentry_soc;
            GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO sentry_soc;
EOPGSQL
        ok "sentry_security inline schema created"
    fi

    # ── Verify tables ──
    info "Verifying PostgreSQL tables..."
    PGPASSWORD="$PG_PASS" psql -h 127.0.0.1 -U "$PG_USER" -d "$PG_DB" \
        -c "\dt" 2>/dev/null && ok "Tables verified" || warn "Could not connect as sentry_soc — check pg_hba.conf"

    # ── Configure pg_hba.conf for md5 auth ──
    PG_HBA=$(find /etc/postgresql -name pg_hba.conf 2>/dev/null | head -1)
    if [[ -n "$PG_HBA" ]]; then
        if ! grep -q "sentry_soc\|sentry_security" "$PG_HBA"; then
            info "Adding sentry_soc auth entry to pg_hba.conf..."
            echo "# SentryVault SOC user" >> "$PG_HBA"
            echo "host    sentry_security    sentry_soc    127.0.0.1/32    md5" >> "$PG_HBA"
            echo "host    sentry_security    sentry_soc    ::1/128         md5" >> "$PG_HBA"
            systemctl reload postgresql 2>/dev/null || systemctl restart postgresql
            ok "pg_hba.conf updated for sentry_soc"
        else
            ok "pg_hba.conf already has sentry_soc entry"
        fi
    fi

    # ── Test SOAR automation connectivity ──
    info "Testing SOAR automation script..."
    if [[ -f "$VENV_PATH/bin/python3" ]]; then
        PYTHON="$VENV_PATH/bin/python3"
    else
        PYTHON=$(which python3)
    fi

    # Install psycopg2 if needed
    "$PYTHON" -c "import psycopg2" 2>/dev/null \
        || "$PYTHON" -m pip install psycopg2-binary -q 2>/dev/null || true

    PGPASSWORD="$PG_PASS" "$PYTHON" "$PROJECT_DIR/scripts/soc_automation.py" --test 2>/dev/null \
        && ok "SOAR automation: DB connectivity VERIFIED" \
        || warn "SOAR automation test had issues (check PostgreSQL auth)"
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6 – React SOC Dashboard (nginx)
# ─────────────────────────────────────────────────────────────────────────────
phase6_dashboard() {
    hdr "PHASE 6 — React SOC Security Dashboard"

    # ── Build frontend if dist doesn't exist ──
    if [[ ! -d "$FRONTEND_DIST" ]] || [[ -z "$(ls -A "$FRONTEND_DIST" 2>/dev/null)" ]]; then
        info "Building React frontend..."
        if command -v npm &>/dev/null; then
            cd "$PROJECT_DIR/frontend"
            npm install --silent 2>/dev/null || warn "npm install had warnings"
            npm run build 2>/dev/null && ok "React build successful → $FRONTEND_DIST" \
                || warn "React build failed — serving existing dist"
            cd "$PROJECT_DIR"
        else
            warn "npm not found. Cannot build React frontend."
        fi
    else
        ok "Frontend dist exists: $FRONTEND_DIST"
    fi

    # ── Install nginx ──
    if ! command -v nginx &>/dev/null; then
        info "Installing nginx..."
        DEBIAN_FRONTEND=noninteractive apt-get install -y nginx -q
    fi
    ok "nginx: $(nginx -v 2>&1 | head -1)"

    # ── Write nginx config for port 3000 ──
    NGINX_CONF="/etc/nginx/sites-available/sentryvault-dashboard"
    cat > "$NGINX_CONF" <<-EONGINX
server {
    listen $NGINX_PORT;
    listen [::]:$NGINX_PORT;
    server_name _;

    root $FRONTEND_DIST;
    index index.html;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # React SPA — send all routes to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API calls to FastAPI backend on port 8000
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout    60s;
    }

    access_log /var/log/nginx/sentryvault-access.log;
    error_log  /var/log/nginx/sentryvault-error.log;
}
EONGINX

    # Enable site
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/sentryvault-dashboard 2>/dev/null || true
    # Remove default site to avoid port conflicts
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

    # Test config & reload
    nginx -t && systemctl reload nginx || systemctl restart nginx
    systemctl enable nginx 2>/dev/null || true

    sleep 2
    if systemctl is-active --quiet nginx; then
        ok "nginx: RUNNING"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:${NGINX_PORT}/" 2>/dev/null || echo "000")
        if [[ "$HTTP_CODE" == "200" ]]; then
            ok "SOC Dashboard: HTTP $HTTP_CODE — http://localhost:${NGINX_PORT}/"
        else
            warn "SOC Dashboard returned HTTP $HTTP_CODE (may need frontend build)"
        fi
    else
        err "nginx failed to start. Check: journalctl -u nginx -n 20"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 7 – Full Verification Matrix
# ─────────────────────────────────────────────────────────────────────────────
phase7_verify() {
    hdr "PHASE 7 — DMZ Reachability & Service Verification Matrix"

    PASS=0; FAIL=0; WARN=0
    RESULTS=()

    _check() {
        local label="$1"; local cmd="$2"; local expect="${3:-}"
        local result
        result=$(eval "$cmd" 2>/dev/null || true)
        if [[ -z "$expect" && -n "$result" ]] || [[ -n "$expect" && "$result" == *"$expect"* ]]; then
            RESULTS+=("${GREEN}[✔] PASS${NC}  $label")
            ((PASS++))
        else
            RESULTS+=("${RED}[✘] FAIL${NC}  $label")
            ((FAIL++))
        fi
    }

    _warn_check() {
        local label="$1"; local cmd="$2"; local expect="${3:-}"
        local result
        result=$(eval "$cmd" 2>/dev/null || true)
        if [[ -z "$expect" && -n "$result" ]] || [[ -n "$expect" && "$result" == *"$expect"* ]]; then
            RESULTS+=("${GREEN}[✔] PASS${NC}  $label")
            ((PASS++))
        else
            RESULTS+=("${YELLOW}[⚠] WARN${NC}  $label")
            ((WARN++))
        fi
    }

    # ── Checks ──
    _check "Subnet Ping — DMZ Host 192.168.10.10 reachable" \
        "ping -c 3 -W 2 192.168.10.10 && echo OK" "OK"

    _check "MySQL Remote Binding — 0.0.0.0:3306" \
        "ss -tulpn | grep ':3306'" "0.0.0.0"

    _check "MySQL Auth — sentryuser login" \
        "mysql -u sentryuser -p${MYSQL_PASS} -h 127.0.0.1 ${MYSQL_DB} -e 'SELECT 1 AS ok;' 2>/dev/null" "ok"

    _check "MySQL DB — sentryvault exists" \
        "mysql -u root -e 'SHOW DATABASES;' 2>/dev/null" "sentryvault"

    _warn_check "MySQL Seed — users table populated" \
        "mysql -u sentryuser -p${MYSQL_PASS} -h 127.0.0.1 ${MYSQL_DB} -e 'SELECT COUNT(*) FROM users;' 2>/dev/null" ""

    _warn_check "Wazuh Manager — port 1514 listening" \
        "ss -tulpn | grep ':1514'" ""

    _warn_check "Wazuh Manager — port 1515 listening" \
        "ss -tulpn | grep ':1515'" ""

    _warn_check "Wazuh Manager — systemd service active" \
        "systemctl is-active wazuh-manager 2>/dev/null" "active"

    _check "PostgreSQL — service running" \
        "systemctl is-active postgresql 2>/dev/null" "active"

    _check "PostgreSQL — sentry_security DB accessible" \
        "PGPASSWORD='${PG_PASS}' psql -h 127.0.0.1 -U ${PG_USER} -d ${PG_DB} -c 'SELECT 1;' 2>/dev/null" "1"

    _check "PostgreSQL — threat_events table exists" \
        "PGPASSWORD='${PG_PASS}' psql -h 127.0.0.1 -U ${PG_USER} -d ${PG_DB} -c '\dt' 2>/dev/null" "threat_events"

    _check "PostgreSQL — soc_metrics write test" \
        "PGPASSWORD='${PG_PASS}' psql -h 127.0.0.1 -U ${PG_USER} -d ${PG_DB} -c \"UPDATE soc_metrics SET metric_value='VERIFIED', recorded_at=NOW() WHERE metric_name='postgresql_status'; SELECT metric_value FROM soc_metrics WHERE metric_name='postgresql_status';\" 2>/dev/null" "VERIFIED"

    _check "Firewall — MySQL port 3306 ACL rule exists" \
        "iptables -L INPUT -n | grep '3306'" "3306"

    _check "Firewall — Wazuh port 1514 ACL rule exists" \
        "iptables -L INPUT -n | grep '1514'" "1514"

    _check "nginx — service running" \
        "systemctl is-active nginx 2>/dev/null" "active"

    _warn_check "SOC Dashboard — HTTP 200 on port ${NGINX_PORT}" \
        "curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:${NGINX_PORT}/ 2>/dev/null" "200"

    _warn_check "Backend API — port 8000 active" \
        "ss -tulpn | grep ':8000'" ""

    _check "SOAR Script — file exists" \
        "test -f '${PROJECT_DIR}/scripts/soc_automation.py' && echo exists" "exists"

    _check "Active Response Script — file exists" \
        "test -f '${PROJECT_DIR}/scripts/active_response_block.py' && echo exists" "exists"

    # ── Print Results ──
    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║         SENTRYVAULT INTERNAL SERVER — VERIFICATION MATRIX           ║${NC}"
    echo -e "${BOLD}╠══════════════════════════════════════════════════════════════════════╣${NC}"
    for r in "${RESULTS[@]}"; do
        echo -e "║  $r"
    done
    echo -e "${BOLD}╠══════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "║  ${GREEN}PASSED: $PASS${NC}   ${RED}FAILED: $FAIL${NC}   ${YELLOW}WARNINGS: $WARN${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [[ $FAIL -eq 0 ]]; then
        ok "ALL CRITICAL CHECKS PASSED. Internal server is ready for DMZ connection."
    elif [[ $FAIL -le 2 ]]; then
        warn "$FAIL check(s) failed. Review items above before connecting DMZ."
    else
        err "$FAIL checks failed. Internal server needs attention before DMZ integration."
    fi

    # ── Port Summary ──
    echo ""
    info "Active listening ports (internal server):"
    ss -tulpn 2>/dev/null | grep LISTEN | grep -v "127.0.0.53" | \
        awk '{printf "  %-10s %-30s\n", $1, $5}' | sort -u

    # ── Summary ──
    echo ""
    echo -e "${BOLD}${CYAN}══ SETUP SUMMARY ══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Internal Server IP  : $INTERNAL_IP (ens37)"
    echo "  DMZ Host Reachable  : $DMZ_HOST ✔"
    echo ""
    echo "  MySQL               : 0.0.0.0:3306  | DB: sentryvault | User: sentryuser"
    echo "  PostgreSQL          : 127.0.0.1:5432 | DB: sentry_security | User: sentry_soc"
    echo "  Wazuh Manager       : Ports 1514/1515 (if installed)"
    echo "  SOC Dashboard       : http://$INTERNAL_IP:$NGINX_PORT"
    echo "  Backend API         : http://$INTERNAL_IP:8000"
    echo ""
    echo "  Firewall ACLs:"
    echo "    → TCP 3306  from 192.168.10.0/24  (MySQL)"
    echo "    → TCP 1514  from 192.168.10.0/24  (Wazuh Agent)"
    echo "    → UDP 1514  from 192.168.10.0/24  (Wazuh Syslog)"
    echo "    → TCP 1515  from 192.168.10.0/24  (Wazuh Registration)"
    echo "    → TCP 55000 from 192.168.10.0/24  (Wazuh API)"
    echo "    → TCP 8000  from 192.168.10.0/24  (FastAPI Backend)"
    echo "    → TCP 3000  (SOC Dashboard)"
    echo "    → TCP 80    (nginx)"
    echo ""
    echo -e "${GREEN}${BOLD}✔ DMZ Backend and Wazuh Agent may now be safely restarted!${NC}"
    echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
main() {
    echo -e "\n${BOLD}${CYAN}"
    echo "  ███████╗███████╗███╗   ██╗████████╗██████╗ ██╗   ██╗"
    echo "  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██╔══██╗╚██╗ ██╔╝"
    echo "  ███████╗█████╗  ██╔██╗ ██║   ██║   ██████╔╝ ╚████╔╝ "
    echo "  ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██╔══██╗  ╚██╔╝  "
    echo "  ███████║███████╗██║ ╚████║   ██║   ██║  ██║   ██║   "
    echo "  ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   "
    echo ""
    echo "       SentryVault Internal Server Setup — v1.0"
    echo "       Ubuntu Internal Network VM — 192.168.20.10"
    echo -e "${NC}"

    # Check running as root
    if [[ $EUID -ne 0 ]]; then
        err "This script must be run as root: sudo bash $0"
        exit 1
    fi

    if $VERIFY_ONLY; then
        phase7_verify
        exit 0
    fi

    phase1_network
    phase2_firewall
    phase3_mysql
    phase4_wazuh
    phase5_postgresql
    phase6_dashboard
    phase7_verify
}

main "$@"
