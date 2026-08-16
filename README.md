# SentryVault — Enterprise Secure Banking Portal & SOC Operations Lab

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.10x-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://vitejs.dev)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://mysql.com)
[![PostgreSQL](https://img.shields.io/badge/SecDB-PostgreSQL%2016-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Wazuh](https://img.shields.io/badge/SIEM-Wazuh%20v4.14.7-00B0FF?style=flat-square&logo=shield&logoColor=white)](#-wazuh-siem--active-response)
[![nginx](https://img.shields.io/badge/Serving-nginx%201.24-009639?style=flat-square&logo=nginx&logoColor=white)](https://nginx.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**SentryVault** is an enterprise-grade core banking portal combined with a custom-built **SentryVault SOC Command Center**. It operates across a segmented multi-VM DMZ layout featuring Caddy reverse proxy, Coraza Web Application Firewall (WAF), Suricata NIDS, centralized Wazuh SIEM, and automated SOAR incident response.

---

## 📖 Table of Contents

- [What is SentryVault?](#-what-is-sentryvault)
- [Live Network Architecture](#-live-network-architecture)
- [Why Build SentryVault SOC Command Center?](#-why-build-sentryvault-soc-command-center)
- [Application Suite & Interface Previews](#-application-suite--interface-previews)
  - [1. SentryVault SOC Command Center](#1-sentryvault-soc-command-center)
  - [2. Live Threat Event Stream & IP Quarantine Manager](#2-live-threat-event-stream--ip-quarantine-manager)
  - [3. Finacle E-Banking Login Gateway](#3-finacle-e-banking-login-gateway)
  - [4. Finacle CBS Administrator & Operations Console](#4-finacle-cbs-administrator--operations-console)
  - [5. Customer Banking Overview Dashboard](#5-customer-banking-overview-dashboard)
- [VM Topology & Network Boundaries](#-vm-topology--network-boundaries)
- [Key Security Features](#-key-security-features)
- [Tech Stack](#-tech-stack)
- [SOAR Automation & Active Response](#-soar-automation--active-response)
- [API Reference](#-api-reference)
- [Deployment Guide](#-deployment-guide)
- [Project Structure](#-project-structure)

---

## 🏦 What is SentryVault?

**SentryVault** is a **production-style cybersecurity lab** built around a realistic core banking portal (Finacle E-Banking Suite). It demonstrates end-to-end enterprise security architecture across a segmented multi-VM network — strictly separating public-facing web applications in the DMZ from internal security monitoring, active firewall enforcement, and SOAR automation in the internal network.

> [!NOTE]
> Demonstrates **real-world DevSecOps & Security Operations skills**: network segmentation, firewall ACLs, SIEM telemetry integration, WAF enforcement, SOAR automation, and high-density dark-theme operations monitoring.

---

## 🌐 Live Network Architecture

The architecture enforces zero-trust principles, isolating public-facing services in a **DMZ Subnet (`192.168.10.0/24`)** while protecting sensitive databases, SIEM managers, and internal security tools inside an **Internal Subnet (`192.168.20.0/24`)**.

```mermaid
flowchart TD
    subgraph Internet["Public Internet / Kali Attacker"]
        Client["Browser / Kali Penetration Testing"]
    end

    subgraph DMZ["DMZ Subnet (192.168.10.0/24) — Debian DMZ VM"]
        Caddy["Caddy Reverse Proxy + Coraza WAF\n(:80 / :443)"]
        FastAPI_DMZ["FastAPI Backend (DMZ)\n(:8000)"]
        React_Bank["Finacle E-Banking Portal\n(:5000 / Vite SPA)"]
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
        SOC_Console["nginx SOC Operations Console\n(:3000 SentryVault SOC)"]
        FastAPI_Int["FastAPI Backend (Internal)\n(:8000)"]
    end

    Client -->|HTTP/HTTPS| Caddy
    Caddy -->|Proxy Request| FastAPI_DMZ
    Caddy -->|Serve Portal| React_Bank
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

## ⚡ Why Build SentryVault SOC Command Center?

Rather than relying on default SIEM dashboards, the **SentryVault SOC Command Center** was custom-engineered specifically for live security operations:

| Feature / Metric | Default SIEM Dashboard | SentryVault SOC Command Center |
|---|---|---|
| **Resource Efficiency** | Requires 4GB+ RAM for heavy search indexers | Lightweight SPA running directly on Nginx with zero memory overhead |
| **Response Latency** | Delayed index processing (5s–30s indexing lag) | Real-time event streaming directly from SOAR & Active Response logs |
| **Inline Actionability** | Read-only alert viewing; requires external SSH for blocking | Direct **1-click / 2-step IP Quarantine & Unblock** controls wired to `iptables` |
| **Shift Ergonomics** | Generic multi-tab interface | Custom dark-theme operations screen scannable in under 3 seconds |
| **Health Telemetry** | Monolithic server health check | Multi-node infrastructure heartbeat with popover latency trend micro-charts |

---

## 🖥️ Application Suite & Interface Previews

### 1. SentryVault SOC Command Center
Located at `http://192.168.20.10:3000` on the **Internal Server**:

![SentryVault SOC Command Center](docs/images/soc_dashboard.png)

- **High-Density Dark Console**: Engineered for 24/7 security analyst shifts with zero glare.
- **Top Bar Controls**: Live system operational status pill (`SYSTEM OPERATIONAL`), real-time UTC clock, `LIVE 5s` auto-refresh toggle, and DMZ host node indicator.
- **4 Metric Cards with SVG Sparklines**: Total Threat Events (24h), Active Quarantined IPs, WAF Triggers, and SOAR Policy Enforcement Status.
- **Infrastructure Heartbeat Strip**: Real-time ping/TCP latency in ms for **MySQL DB**, **PostgreSQL SOC**, **Wazuh Manager**, **Internal Host**, and **DMZ Host**. Hovering displays popover micro-charts of recent latency history.

---

### 2. Live Threat Event Stream & IP Quarantine Manager
Located on the lower panel of the SOC Command Console:

![Live Threat Event Stream & IP Quarantine Manager](docs/images/soc_quarantine.png)

- **Live Threat Event Stream**: Real-time auto-scrolling log table featuring **Spacebar pause shortcut**, hover pause, inline search filter by IP/severity/attack type, and raw JSON alert payload inspector.
- **IP Quarantine Manager**: Active table of quarantined IPs (`192.168.10.55`, `10.0.0.42`, `10.10.5.15`), block reasons (SSH Brute Force, SQL Injection), timestamps, and inline 2-step confirmation **UNBLOCK** action.
- **Scoped Export Bar**: Scoped JSON and CSV report export pipeline matching active filter views.

---

### 3. Finacle E-Banking Login Gateway
Located at `http://localhost:5000/login` (DMZ Network):

![Finacle E-Banking Login Gateway](docs/images/login_gateway.png)

- **Branded Authentication Gateway**: Finacle CBS Operator & Customer Access Portal with 256-bit TLS encryption indicator.
- **Role-Based Access**: Supports both Customer Access and CBS Administrator Access with signed security tokens.

---

### 4. Finacle CBS Administrator & Operations Console
Located at `http://localhost:5000/admin-dashboard` (DMZ Network):

![Finacle CBS Administrator Console](docs/images/admin_console.png)

- **Core Banking Metrics**: Vault Deposits (`₹4,50,408.73`), Total Customers (`4`), Active Accounts (`10`), and Frozen Accounts (`0`).
- **Customer Accounts Directory**: Account status management grid with real-time **Freeze Account** and **Close** operational controls.
- **System Audit Log**: Real-time administrative oversight log tracking account approvals and status changes.

---

### 5. Customer Banking Overview Dashboard
Located at `http://localhost:5000/dashboard` (DMZ Network):

![Customer Account Overview Dashboard](docs/images/customer_dashboard.png)

- **Customer Account Ledger**: Net ledger balance (`₹84,179.90`) across linked savings and current accounts.
- **Transaction Records**: Detailed transaction history displaying transaction reference numbers, value dates, amounts, and completion status.
- **Fund Transfer Workflow**: Immediate IMPS/NEFT transfer trigger modal with beneficiary directory.
- **Security Advisories**: Live login alerts and security advisories.

---

## 🖥️ VM Topology & Network Boundaries

| VM Node | IP Address | Subnet | Dedicated Role & Services |
|---|---|---|---|
| **Debian DMZ VM** | `192.168.10.10` | `192.168.10.0/24` | • Caddy Reverse Proxy & Coraza WAF (`:80`, `:443`)<br>• Customer Core Banking Web Application (`:5000`)<br>• FastAPI DMZ Application Backend (`:8000`)<br>• Wazuh Log Collector Agent (`:1514`) |
| **Ubuntu Internal VM** | `192.168.20.10` | `192.168.20.0/24` | • Core Banking Application Database (`:3306`)<br>• PostgreSQL SOC Security Database (`:5432`)<br>• Wazuh SIEM Manager v4.14.7 (`:1514`, `:1515`, `:55000`)<br>• SOAR Threat Automation & iptables Auto-Block<br>• **SentryVault SOC Command Center (`:3000` / `:80`)** |

---

## 🔐 Key Security Features

| Component | Security Feature | Implementation Details |
|---|---|---|
| **WAF Protection** | Coraza WAF + OWASP CRS | Blocks SQLi, XSS, Path Traversal, and Command Injection at the Caddy edge proxy. |
| **Auth & Access Control** | JWT + RBAC | RS256 signed JWTs with bcrypt password hashing; strict `ADMIN` vs `CUSTOMER` roles. |
| **SIEM Telemetry** | Wazuh Manager v4.14.7 | Real-time JSON application log ingestion, file integrity monitoring (FIM), and rootkit analysis. |
| **SOAR Automation** | Automated IP Quarantine | `active_response_block.py` automatically blocks offending IPs via `iptables` upon High/Critical alerts (severity ≥ 8). |
| **Network ACLs** | Strict `iptables` Firewall | Scoped ACCEPT rules restricting internal database (`:3306`) and SIEM (`:1514`) access strictly to DMZ IPs. |

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Description |
|---|---|---|---|
| **Frontend** | React + Vite | 18.x / 5.x | Core Banking Portal SPA + SentryVault SOC Command Center |
| **Styling** | TailwindCSS + Custom Dark System | 3.x | SentryVault custom dark operations design system |
| **Backend** | FastAPI + uvicorn | 0.10x | Async REST API, JWT auth, Pydantic schemas |
| **SIEM Engine** | Wazuh Manager | **v4.14.7** | Real-time log collector & alert correlation engine |
| **SOAR Engine** | Python 3 + psycopg2 | 3.12 | Automated iptables DROP blocker + PostgreSQL writer |
| **Serving** | Nginx | 1.24 | SentryVault SOC Command Center serving on ports 80 & 3000 |

---

## 📡 Wazuh SIEM & SOAR Automation

Wazuh Manager **v4.14.7** runs on the Internal VM (`192.168.20.10`) listening on ports `1514` (log shipping) and `55000` (REST API).

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
                      └── SentryVault SOC Command Center Display & Storage
```

---

## ⚡ SOAR Automation CLI

[`scripts/soc_automation.py`](scripts/soc_automation.py) controls security workflows:

```bash
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
| `GET` | `/transactions/transfer` | Authenticated | Execute fund transfer |
| `GET` | `/soc/threats` | 🔐ADMIN | Paginated threat events stream |
| `GET` | `/soc/blocked-ips` | 🔐ADMIN | List active quarantined IPs |
| `POST` | `/soc/block-ip` | 🔐ADMIN | Quarantine IP (iptables DROP) |
| `POST` | `/soc/unblock-ip` | 🔐ADMIN | Remove IP from quarantine |
| `GET` | `/soc/waf-alerts` | 🔐ADMIN | Coraza/Caddy WAF alert log |
| `GET` | `/soc/health-check` | Public | TCP socket & ping tests for all nodes |

---

## 🚀 Deployment Guide

```bash
# 1. Setup Debian DMZ VM (192.168.10.10)
git clone https://github.com/abhienix/SentryVault.git
cd SentryVault/deployment
sudo bash setup_debian_dmz_vm.sh

# 2. Setup Ubuntu Internal VM (192.168.20.10)
git clone https://github.com/abhienix/SentryVault.git
cd SentryVault/deployment
sudo bash setup_internal_server.sh
```

- **SentryVault SOC Command Center**: `http://localhost:3000` (or `http://localhost`)
- **FastAPI Documentation**: `http://localhost:8000/docs`

---

## 📁 Project Structure

```text
SentryVault/
├── docs/images/                # Interface screenshots for README
│   ├── soc_dashboard.png
│   ├── soc_quarantine.png
│   ├── login_gateway.png
│   ├── admin_console.png
│   └── customer_dashboard.png
│
├── backend/                    # FastAPI Application
│   ├── app/
│   │   ├── api/routers/        # Auth, Accounts, Transactions, Admin, SOC
│   │   ├── core/               # Configuration, Security, Logging
│   │   └── database/           # MySQL session & PostgreSQL soc_session
│   └── requirements.txt
│
├── frontend/                   # React + Vite Application
│   └── src/
│       ├── components/soc/     # SentryVault SOC components (TopBar, Cards, Stream, Quarantine)
│       ├── pages/              # SOCDashboard.jsx, Login.jsx, AdminDashboard.jsx, Dashboard.jsx
│       └── styles/             # soc-grafana.css (SentryVault dark design system)
│
├── scripts/
│   ├── soc_automation.py       # SOAR CLI engine (iptables + DB)
│   └── active_response_block.py # Wazuh Active Response blocker
│
├── deployment/
│   ├── setup_internal_server.sh # Master Internal VM setup
│   └── setup_debian_dmz_vm.sh   # DMZ VM setup
│
└── README.md
```

---

<div align="center">

**SentryVault DevSecOps Lab · Built for Security Operations & Cybersecurity Demonstration**  
FastAPI · React · MySQL 8 · PostgreSQL 16 · Wazuh v4.14.7 · Nginx · SOAR

**Maintained by [@abhienix](https://github.com/abhienix)**

</div>
