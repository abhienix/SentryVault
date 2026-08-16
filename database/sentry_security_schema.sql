-- ============================================================
-- SentryVault SOC Security Database
-- PostgreSQL schema for threat tracking, SOAR, and SOC metrics
-- Run as: sudo -u postgres psql -f sentry_security_schema.sql
-- ============================================================

-- Create database and user (run as superuser)
SELECT 'CREATE DATABASE sentry_security'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sentry_security')\gexec

-- Connect to the database
\c sentry_security

-- Create SOC user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sentry_soc') THEN
        CREATE USER sentry_soc WITH PASSWORD 'SocSecurityPass123!';
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE sentry_security TO sentry_soc;
GRANT ALL ON SCHEMA public TO sentry_soc;

-- ============================================================
-- Table: threat_events
-- Stores all security events detected by Wazuh / WAF / IDS
-- ============================================================
CREATE TABLE IF NOT EXISTS threat_events (
    id              SERIAL PRIMARY KEY,
    source_ip       VARCHAR(45)   NOT NULL DEFAULT 'unknown',
    threat_type     VARCHAR(100)  NOT NULL DEFAULT 'UNKNOWN',
    severity        VARCHAR(20)   NOT NULL DEFAULT 'MEDIUM'
                    CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    description     TEXT,
    timestamp       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    raw_alert       JSONB,
    status          VARCHAR(30)   NOT NULL DEFAULT 'DETECTED'
                    CHECK (status IN ('DETECTED','INVESTIGATING','BLOCKED','RESOLVED','FALSE_POSITIVE')),
    resolved_at     TIMESTAMPTZ,
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_threat_events_source_ip   ON threat_events(source_ip);
CREATE INDEX IF NOT EXISTS idx_threat_events_timestamp   ON threat_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_severity    ON threat_events(severity);
CREATE INDEX IF NOT EXISTS idx_threat_events_status      ON threat_events(status);

-- ============================================================
-- Table: blocked_ips
-- Tracks IPs blocked by SOAR automation (iptables rules)
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_ips (
    id              SERIAL PRIMARY KEY,
    ip_address      VARCHAR(45)   NOT NULL UNIQUE,
    reason          TEXT,
    blocked_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    unblocked_at    TIMESTAMPTZ,
    threat_event_id INTEGER       REFERENCES threat_events(id) ON DELETE SET NULL,
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    block_source    VARCHAR(50)   DEFAULT 'SOAR'
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip      ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active  ON blocked_ips(active);

-- ============================================================
-- Table: waf_alerts
-- Web Application Firewall alerts (SQLi, XSS, Path Traversal)
-- ============================================================
CREATE TABLE IF NOT EXISTS waf_alerts (
    id              SERIAL PRIMARY KEY,
    source_ip       VARCHAR(45)   NOT NULL,
    target_url      TEXT,
    attack_type     VARCHAR(50)   NOT NULL
                    CHECK (attack_type IN ('SQLI','XSS','PATH_TRAVERSAL','BRUTE_FORCE','CSRF','LFI','RFI','XXE','OTHER')),
    payload         TEXT,
    http_method     VARCHAR(10),
    response_code   INTEGER,
    user_agent      TEXT,
    severity        VARCHAR(20)   NOT NULL DEFAULT 'MEDIUM',
    detected_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    blocked         BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_waf_alerts_source_ip    ON waf_alerts(source_ip);
CREATE INDEX IF NOT EXISTS idx_waf_alerts_attack_type  ON waf_alerts(attack_type);
CREATE INDEX IF NOT EXISTS idx_waf_alerts_detected_at  ON waf_alerts(detected_at DESC);

-- ============================================================
-- Table: soc_metrics
-- Key-value store for real-time SOC dashboard metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS soc_metrics (
    id              SERIAL PRIMARY KEY,
    metric_name     VARCHAR(100)  NOT NULL UNIQUE,
    metric_value    TEXT          NOT NULL,
    recorded_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed initial metrics and sample threat data
-- ============================================================

-- SOC Dashboard baseline metrics
INSERT INTO soc_metrics (metric_name, metric_value) VALUES
    ('total_threats_detected',  '0'),
    ('threats_blocked_today',   '0'),
    ('waf_alerts_24h',          '0'),
    ('active_blocked_ips',      '0'),
    ('last_alert_processed',    'Never'),
    ('last_blocked_ip',         'None'),
    ('soar_status',             'ONLINE'),
    ('connection_test',         'PENDING'),
    ('wazuh_manager_status',    'NOT_INSTALLED'),
    ('mysql_status',            'ONLINE'),
    ('postgresql_status',       'ONLINE')
ON CONFLICT (metric_name) DO NOTHING;

-- Sample threat events for SOC dashboard visualization
INSERT INTO threat_events (source_ip, threat_type, severity, description, status) VALUES
    ('192.168.10.55',  'BRUTE_FORCE',    'HIGH',     'SSH brute force attack detected — 47 failed attempts', 'BLOCKED'),
    ('10.0.0.42',      'SQLI',           'CRITICAL',  'SQL Injection in /demo/sqli endpoint — UNION SELECT payload', 'BLOCKED'),
    ('192.168.10.88',  'XSS',            'MEDIUM',    'Reflected XSS attempt on /demo/xss endpoint', 'INVESTIGATING'),
    ('172.16.5.20',    'PATH_TRAVERSAL', 'HIGH',      'Directory traversal attempt: ../../../etc/passwd', 'RESOLVED'),
    ('192.168.10.100', 'RECON',          'LOW',       'Port scan detected from DMZ subnet', 'DETECTED'),
    ('10.10.5.15',     'BRUTE_FORCE',    'CRITICAL',  'Admin login brute force — account locked', 'BLOCKED'),
    ('192.168.1.55',   'SQLI',           'HIGH',      'Blind SQL injection detected in account API', 'BLOCKED'),
    ('10.0.0.100',     'XSS',            'MEDIUM',    'Stored XSS payload detected in profile update', 'RESOLVED')
ON CONFLICT DO NOTHING;

-- Sample WAF alerts
INSERT INTO waf_alerts (source_ip, target_url, attack_type, payload, http_method, response_code, severity, blocked) VALUES
    ('192.168.10.55',  '/api/v1/auth/login',           'BRUTE_FORCE',    'Multiple rapid auth attempts',         'POST', 429, 'HIGH',     TRUE),
    ('10.0.0.42',      '/demo/sqli',                   'SQLI',           "' UNION SELECT * FROM users--",        'GET',  200, 'CRITICAL', TRUE),
    ('192.168.10.88',  '/demo/xss',                    'XSS',            '<script>alert(document.cookie)</script>', 'GET', 200, 'MEDIUM',  FALSE),
    ('172.16.5.20',    '/demo/path-traversal',         'PATH_TRAVERSAL', '../../../etc/passwd',                  'GET',  403, 'HIGH',     TRUE),
    ('10.10.5.15',     '/api/v1/admin/users',          'BRUTE_FORCE',    'Admin credential stuffing attempt',    'POST', 401, 'CRITICAL', TRUE)
ON CONFLICT DO NOTHING;

-- Sample blocked IPs
INSERT INTO blocked_ips (ip_address, reason, active, block_source) VALUES
    ('192.168.10.55',  'Brute force SSH attack',                   TRUE,  'SOAR'),
    ('10.0.0.42',      'SQL Injection — Critical severity',         TRUE,  'WAF'),
    ('10.10.5.15',     'Admin brute force — CRITICAL',              TRUE,  'SOAR'),
    ('172.16.5.20',    'Path traversal attack — HIGH severity',     FALSE, 'WAF')
ON CONFLICT (ip_address) DO NOTHING;

-- Update metric counts to match seed data
UPDATE soc_metrics SET metric_value = '8' WHERE metric_name = 'total_threats_detected';
UPDATE soc_metrics SET metric_value = '3' WHERE metric_name = 'active_blocked_ips';
UPDATE soc_metrics SET metric_value = '5' WHERE metric_name = 'waf_alerts_24h';
UPDATE soc_metrics SET metric_value = NOW()::TEXT WHERE metric_name = 'last_alert_processed';

-- Grant table permissions to sentry_soc
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sentry_soc;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sentry_soc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sentry_soc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sentry_soc;

-- Verification
SELECT
    'sentry_security schema initialized successfully' AS status,
    COUNT(*) AS threat_events_seeded
FROM threat_events;

SELECT metric_name, metric_value FROM soc_metrics ORDER BY metric_name;
