# SentryVault — Enterprise Secure Banking Portal & SOC Operations Lab

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.10x-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://vitejs.dev)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://mysql.com)
[![PostgreSQL](https://img.shields.io/badge/SecDB-PostgreSQL%2016-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Wazuh](https://img.shields.io/badge/SIEM-Wazuh%20v4.14.7-00B0FF?style=flat-square&logo=shield&logoColor=white)](#-wazuh-siem--active-response)
[![nginx](https://img.shields.io/badge/Serving-nginx%201.24-009639?style=flat-square&logo=nginx&logoColor=white)](https://nginx.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**SentryVault** is an enterprise-grade core banking portal combined with a dedicated **Security Operations Center (SOC) Command Console**. It operates across a segmented multi-VM DMZ layout featuring Caddy reverse proxy, Coraza Web Application Firewall (WAF), Suricata NIDS, centralized Wazuh SIEM, and automated SOAR incident response.

---

## 📖 Table of Contents

- [What is SentryVault?](#-what-is-sentryvault)
- [Live Network Architecture](#-live-network-architecture)
- [VM Topology & Service Isolation](#-vm-topology--service-isolation)
- [Grafana Dark SOC Command Console](#-grafana-dark-soc-command-console)
- [Key Security Features](#-key-security-features)
- [Tech Stack](#-tech-stack)
- [Database Schemas](#-database-schemas)
- [Wazuh SIEM & Active Response](#-wazuh-siem--active-response)
- [SOAR Automation](#-soar-automation)
- [API Reference](#-api-reference)
- [Demo Vulnerability Lab](#-demo-vulnerability-lab)
- [Deployment Guide](#-deployment-guide)
- [Default Credentials](#-default-credentials)
- [Project Structure](#-project-structure)
- [Verification Matrix](#-verification-matrix)

---

## 🏦 What is SentryVault?

**SentryVault** is a **production-style, full-stack cybersecurity lab** built around a realistic core banking application. It demonstrates end-to-end enterprise security architecture across a segmented multi-VM network — separating public-facing web applications in the DMZ from internal security monitoring, databases, and SOAR automation in the internal network.

> [!NOTE]
> Demonstrates **real-world DevSecOps & Security Operations skills**: network segmentation, firewall ACLs, SIEM telemetry integration, WAF enforcement, SOAR automation, and high-density dark-theme operations monitoring.

---

## 🌐 Live Network Architecture

The architecture enforces zero-trust principles, isolating public-facing services in a **DMZ Subnet (`192.168.10.0/24`)** while protecting sensitive databases, SIEM managers, and internal tools inside an **Internal Subnet (`192.168.20.0/24`)**.

```mermaid
flowchart TD
    subgraph Internet["Public Internet / Attacker"]
        Client["Browser / Attacker Kali"]
    end

    subgraph DMZ["DMZ Subnet (192.168.10.0/24) — Debian DMZ VM"]
        Caddy["Caddy Reverse Proxy + Coraza WAF\n(:80 / :443)"]
        FastAPI_DMZ["FastAPI Backend (DMZ)\n(:8000)"]
        React_Bank["Customer Core Banking App\n(Vite SPA)"]
        Wazuh_Agent["Wazuh Agent\n(Logs Shipper)"]
    end

    subgraph Firewall["Internal Firewall & ACLs"]
        ACL["iptables ACLs / Route Filtering"]
    end

    subgraph Internal["Internal Subnet (192.168.20.0/24) — Ubuntu Internal VM"]
        MySQL[("MySQL 8 Database\nsentryvault DB (:3306)")]
        Wazuh_Mgr["Wazuh SIEM Manager v4.14.7\n(:1514 / :1515 / :55000)"]
        Postgres[("PostgreSQL 16\nsentry_security DB (:5432)")]
        SOAR["SOAR Engine\nsoc_automation.py"]
        SOC_Console["nginx SOC Operations Console\n(:3000 Grafana Dark Theme)"]
        FastAPI_Int["FastAPI Backend (Internal)\n(:8000)"]
    end

    Client -->|HTTP/HTTPS| Caddy
    Caddy -->|Proxy Request| FastAPI_DMZ
    Caddy -->|Serve App| React_Bank
    FastAPI_DMZ -->|JSON Logs| Wazuh_Agent

    FastAPI_DMZ -.->|SQL Queries via ACL| ACL -.-> MySQL
    Wazuh_Agent -.->|Log Shipping via ACL| ACL -.-> Wazuh_Mgr

    Wazuh_Mgr -->|Alert Event| SOAR
    SOAR -->|Persist Threats| Postgres
    SOAR -->|Auto Block IP| ACL
    SOC_Console -->|Read Metrics| FastAPI_Int
    FastAPI_Int -->|Query Threats| Postgres
```

---

## 🖥️ VM Topology & Service Isolation

| VM Node | IP Address | Subnet | Dedicated Role & Services |
|---|---|---|---|
| **Debian DMZ VM** | `192.168.10.10` | `192.168.10.0/24` | • Caddy Reverse Proxy & Coraza WAF (`:80`, `:443`)<br>• Customer Core Banking Web Application<br>• FastAPI DMZ Application Backend (`:8000`)<br>• Wazuh Log Collector Agent (`:1514`) |
| **Ubuntu Internal VM** | `192.168.20.10` | `192.168.20.0/24` | • MySQL 8 Application Database (`:3306`)<br>• PostgreSQL 16 SOC/Security Database (`:5432`)<br>• Wazuh SIEM Manager v4.14.7 (`:1514`, `:1515`, `:55000`)<br>• SOAR Threat Automation & iptables Auto-Block<br>• **Standalone Grafana Dark SOC Console (`:3000`)** |

---

## ⬛ Grafana Dark SOC Command Console

The Internal Server (`192.168.20.10:3000`) serves a dedicated **Grafana-style Security Operations Console** built for security analysts watching live feeds during long operational shifts.

### Design System & Layout (`#0d1117` Dark Theme)
- **Top Bar**: System status pill (`SYSTEM OPERATIONAL` / `DEGRADED` / `UNDER ATTACK`), real-time UTC clock, auto-refresh toggle, and DMZ host status node.
- **4 Metric Cards with SVG Sparklines**:
  - **Total Threat Events (24h)**: PostgreSQL `threat_events` count with trend line & delta.
  - **Active Quarantined IPs**: Active `iptables DROP` rules with daily change count.
  - **WAF Triggers**: Coraza / Caddy WAF attack trigger total.
  - **SOAR Policy Status**: Active `iptables` auto-drop enforcement state.
- **Infrastructure Heartbeat Strip**: Live status dots & TCP latency in ms for MySQL, PostgreSQL, Wazuh, DMZ, and Internal hosts. Hovering reveals a **micro-chart popover** of recent latency history.
- **Live Threat Event Stream**: High-density auto-scrolling log table with **Spacebar pause shortcut**, hover pause, inline filters (severity, attack type, IP), and a syntax-highlighted copyable **raw JSON alert modal**.
- **IP Quarantine Manager**: Active blocked IPs grid with a **2-step unblock confirmation modal** to prevent accidental single-click unblocks, and a manual quarantine dialog.
- **Vulnerability Test Runner**: Interactive test runner panel featuring 4 attack probes (**SQLi**, **XSS**, **Path Traversal**, **Brute Force Burst**) with running animations and inline pass/fail validation badges.
- **Scoped Export Pipeline**: Filter-aware JSON & CSV report export buttons displaying exact active event counts.

---

## 🔐 Key Security Features

| Component | Security Feature | Implementation Details |
|---|---|---|
| **WAF Protection** | Coraza WAF + OWASP CRS | Blocks SQLi, XSS, Path Traversal, and Command Injection at the Caddy edge proxy. |
| **Auth & Access Control** | JWT + RBAC | RS256 signed JWTs with bcrypt password hashing; strict `ADMIN` vs `CUSTOMER` roles. |
| **SIEM Telemetry** | Wazuh Manager v4.14.7 | Real-time JSON application log ingestion, file integrity monitoring (FIM), and rootkit analysis. |
| **SOAR Automation** | Automated IP Quarantine | `active_response_block.py` automatically blocks offending IPs via `iptables` upon High/Critical alerts (severity ≥ 8). |
| **Network ACLs** | Strict `iptables` Firewall | Scoped ACCEPT rules restricting internal MySQL (`:3306`) and Wazuh Manager (`:1514`) access strictly to DMZ IPs. |
| **Structured Logging** | Wazuh-Compatible JSON | All application actions, auth attempts, and transaction logs are output as structured JSON objects. |
| **Vulnerability Lab** | Toggleable `DEMO_MODE` | Safe endpoint suite under `/demo/*` to simulate attacks and validate SIEM & WAF detection rules. |

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Description |
|---|---|---|---|
| **Frontend** | React + Vite | 18.x / 5.x | Core Banking Portal SPA + Grafana Dark SOC Console |
| **Styling** | TailwindCSS + Custom Dark System | 3.x | Custom Grafana dark design system (`#0d1117` / `#161b22`) |
| **Backend** | FastAPI + uvicorn | 0.10x | Async REST API, JWT auth, Pydantic schemas |
| **App DB** | MySQL 8 | 8.x | `sentryvault` DB (users, accounts, transactions) |
| **Security DB** | PostgreSQL 16 | 16.x | `sentry_security` DB (threats, blocked IPs, WAF alerts) |
| **SIEM** | Wazuh Manager | **v4.14.7** | Real-time log collector & alert correlation engine |
| **SOAR Engine** | Python 3 + psycopg2 | 3.12 | Automated iptables DROP blocker + PostgreSQL writer |
| **Serving** | Nginx | 1.24 | Internal SOC Console serving on port 3000 |

---

## 🗄️ Database Schemas

### MySQL — `sentryvault` (Application DB)
```sql
users           (id, username, email, hashed_password, full_name, phone, role, is_active)
accounts        (id, user_id, account_number, account_type, balance, currency, ifsc_code, status)
transactions    (id, transaction_ref, source_account_id, target_account_id, amount, type, status)
beneficiaries   (id, user_id, name, account_number, bank_name, ifsc_code, nickname)
audit_logs      (id, user_id, action, ip_address, user_agent, details, created_at)
```

### PostgreSQL — `sentry_security` (SOC / SOAR DB)
```sql
threat_events   (id, source_ip, threat_type, severity, description, timestamp, raw_alert, status)
blocked_ips     (id, ip_address, reason, blocked_at, threat_event_id, active, block_source)
waf_alerts      (id, source_ip, target_url, attack_type, payload, severity, detected_at, blocked)
soc_metrics     (id, metric_name, metric_value, recorded_at)
```

---

## 📡 Wazuh SIEM & Active Response

Wazuh Manager **v4.14.7** runs on the Internal VM (`192.168.20.10`) listening on:
- `1514` TCP/UDP — Log shipping
- `1515` TCP — Agent registration
- `55000` TCP — Wazuh REST API

### Active Response Workflow

```
Wazuh Manager Alert (Severity ≥ 8)
              │
              ▼
    active_response_block.py
              │
              ├── iptables -I INPUT 1 -s <IP> -j DROP
              │
              └── soc_automation.py --alert '<JSON>'
                      │
                      └── PostgreSQL: INSERT threat_events + blocked_ips
```

---

## ⚡ SOAR Automation CLI

[`scripts/soc_automation.py`](scripts/soc_automation.py) controls security workflows:

```bash
# Test PostgreSQL connectivity + write
python3 scripts/soc_automation.py --test

# List recent threat events
python3 scripts/soc_automation.py --list-threats

# List currently blocked IPs
python3 scripts/soc_automation.py --list-blocked

# Manually block an IP (iptables + DB)
python3 scripts/soc_automation.py --block-ip 192.168.10.99 --reason "SQLi Attack"

# Unblock an IP
python3 scripts/soc_automation.py --unblock-ip 192.168.10.99
```

---

## 📚 API Reference

Base URL: `http://<HOST>:8000/api/v1`

| Method | Endpoint | Auth Scope | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Obtain JWT token |
| `POST` | `/auth/register` | Public | Create new customer account |
| `GET` | `/accounts/` | Authenticated | List user accounts |
| `GET` | `/accounts/{id}` | Authenticated | Account details |
| `POST` | `/transactions/transfer` | Authenticated | Execute fund transfer |
| `GET` | `/transactions/` | Authenticated | Search transaction history |
| `GET` | `/soc/threats` | 🔐ADMIN | Paginated threat events stream (PostgreSQL) |
| `GET` | `/soc/blocked-ips` | 🔐ADMIN | List active quarantined IPs |
| `POST` | `/soc/block-ip` | 🔐ADMIN | Quarantine IP (PostgreSQL + iptables DROP) |
| `POST` | `/soc/unblock-ip` | 🔐ADMIN | Remove IP from quarantine |
| `GET` | `/soc/waf-alerts` | 🔐ADMIN | Coraza/Caddy WAF alert log |
| `GET` | `/soc/health-check` | Public | TCP socket ping tests for all nodes |
| `GET` | `/soc/banking-kpis` | 🔐ADMIN | Security & system metric counts |
| `GET` | `/demo/sqli` | Public (Demo) | Simulated SQL Injection probe |
| `GET` | `/demo/xss` | Public (Demo) | Simulated Reflected XSS probe |
| `GET` | `/demo/path-traversal` | Public (Demo) | Simulated Path Traversal probe |
| `POST` | `/demo/brute-force` | Public (Demo) | Simulated Auth Brute Force burst |

---

## 🧪 Demo Vulnerability Lab

When `DEMO_MODE=true`, controlled vulnerable endpoints are exposed for WAF and SIEM rule testing:

| Endpoint | Attack Category | Triggered Wazuh Rule | Expected Action |
|---|---|---|---|
| `GET /demo/sqli?id=<payload>` | SQL Injection | Rule `31100` | WAF 403 Block & SIEM Alert |
| `GET /demo/xss?msg=<payload>` | Reflected XSS | Rule `31101` | WAF 403 Block & SIEM Alert |
| `GET /demo/path-traversal?file=<path>` | Path Traversal (LFI) | Rule `31102` | WAF 403 Block & SIEM Alert |
| `POST /demo/brute-force` | Auth Brute Force | Rule `31103` | Rate-limit Throttle & SIEM Alert |

---

## 🚀 Deployment Guide

### Option 1: Multi-VM Production Layout

```bash
# 1. Setup Debian DMZ VM (192.168.10.10)
git clone https://github.com/abhienix/SentryVault.git
cd SentryVault/deployment
sudo bash setup_debian_dmz_vm.sh

# 2. Setup Ubuntu Internal VM (192.168.20.10)
git clone https://github.com/abhienix/SentryVault.git
cd SentryVault/deployment
sudo bash setup_internal_server.sh

# 3. Verify Subnet Reachability
ping -c 3 192.168.10.10
mysql -u sentryuser -pSecureDbPassword123! -h 192.168.20.10 sentryvault -e "SELECT 1;"
```

### Option 2: Local Docker Compose (Development)

```bash
git clone https://github.com/abhienix/SentryVault.git
cd SentryVault
cp .env.example .env
docker-compose up -d --build
docker-compose exec backend python scripts/seed_data.py
```

- **Internal SOC Console**: `http://localhost:3000`
- **FastAPI Documentation**: `http://localhost:8000/docs`

---

## 🔑 Default Credentials

| Service | Username | Password | Access Location |
|---|---|---|---|
| **Banking Customer** | `john_doe` | `Password123!` | DMZ Banking Portal |
| **Banking Admin** | `admin` | `Password123!` | DMZ Banking Portal |
| **MySQL Database** | `sentryuser` | `SecureDbPassword123!` | `192.168.20.10:3306` |
| **PostgreSQL Database** | `sentry_soc` | `SocSecurityPass123!` | `127.0.0.1:5432` |
| **Wazuh Manager API** | `wazuh-wui` | `MyS3cr37P450r.*-` | `https://192.168.20.10:55000` |

---

## 📁 Project Structure

```text
SentryVault/
├── backend/                    # FastAPI Application
│   ├── app/
│   │   ├── api/routers/        # Auth, Accounts, Transactions, Admin, Demo, SOC
│   │   ├── core/               # Configuration, Security, Logging
│   │   ├── database/           # MySQL session & PostgreSQL soc_session
│   │   ├── models/             # SQLAlchemy ORM database models
│   │   └── schemas/            # Pydantic validation schemas (soc.py)
│   ├── alembic/                # Database migrations
│   └── requirements.txt
│
├── frontend/                   # React + Vite Application
│   └── src/
│       ├── components/soc/     # Grafana dark components (TopBar, Cards, Stream, Quarantine)
│       ├── pages/              # SOCDashboard.jsx (Grafana Dark Console)
│       ├── services/           # socService.js (Axios API client)
│       └── styles/             # soc-grafana.css (#0d1117 dark design system)
│
├── database/
│   ├── init.sql                # MySQL schema init
│   └── sentry_security_schema.sql  # PostgreSQL SOC DB schema
│
├── scripts/
│   ├── seed_data.py            # MySQL data seeder
│   ├── soc_automation.py       # SOAR CLI engine (iptables + PostgreSQL)
│   └── active_response_block.py # Wazuh Active Response blocker
│
├── deployment/
│   ├── setup_internal_server.sh # Master Internal VM setup
│   ├── setup_debian_dmz_vm.sh   # DMZ VM setup
│   └── caddy-debian-dmz.Caddyfile
│
├── docker-compose.yml
└── README.md
```

---

## ✅ Verification Matrix (Internal Server)

| Verification Check | Result |
|---|---|
| Internal IP `192.168.20.10` on `ens37` | ✔ PASS |
| DMZ `192.168.10.10` ping reachable | ✔ PASS — 1.7ms RTT |
| MySQL `0.0.0.0:3306` bound & accessible | ✔ PASS |
| Wazuh Manager v4.14.7 — ports 1514/1515/55000 active | ✔ PASS |
| PostgreSQL `sentry_security` — 4 tables seeded | ✔ PASS |
| SOAR `soc_automation.py` — iptables block verified | ✔ PASS |
| Nginx Grafana Dark SOC Console — HTTP 200 on `:3000` | ✔ PASS |
| FastAPI Backend — `ONLINE` on `:8000` | ✔ PASS |
| Production bundle compiled (`index-B5uB11-0.js`) | ✔ PASS |

---

<div align="center">

**SentryVault DevSecOps Lab · Built for Security Operations & Cybersecurity Demonstration**  
FastAPI · React · MySQL 8 · PostgreSQL 16 · Wazuh v4.14.7 · Nginx · SOAR

**Maintained by [@abhienix](https://github.com/abhienix)**

</div>
