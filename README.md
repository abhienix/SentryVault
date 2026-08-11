# SecureBank Portal

[![Security Monitoring: Wazuh](https://img.shields.io/badge/Security-Wazuh%20%2F%20Sentry-blue.svg)](#security-monitoring)
[![Framework: FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg)](https://vitejs.dev)
[![Database: MySQL 8](https://img.shields.io/badge/Database-MySQL%208-4479A1.svg)](https://mysql.com)

**SecureBank Portal** is an enterprise-grade online banking application designed to operate inside a DMZ behind Caddy reverse proxy, Coraza Web Application Firewall (WAF), and Sentry/Wazuh security monitoring agents.

---

## Key Features

- **Authentication & Authorization**: JWT token-based authentication with bcrypt password hashing and RBAC (`ADMIN`, `CUSTOMER`).
- **Account Management**: View savings/current account details, balances, IFSC codes, branch names, and account statuses.
- **Atomic Fund Transfers**: Perform instant fund transfers between accounts with balance verification, reference ID generation, transaction notes, and audit logs.
- **Ledger History & Search**: Paginated transaction history with filters for date ranges, transaction amounts, and text search.
- **Beneficiary Directory**: Save and manage frequent transfer recipients.
- **User Profile & Audit Log**: Update profile data, change passwords, and review detailed user activity audit logs.
- **Structured Application Logging**: Outputs JSON-structured security audit logs to `/app/logs/application.log` formatted specifically for Wazuh log ingestion.
- **Sentry Demo Mode**: Toggleable `DEMO_MODE` environment flag exposing controlled vulnerable endpoints under `/demo/*` (SQLi, XSS, Brute Force, Path Traversal) for WAF rule demonstration; returns `404 Not Found` when `DEMO_MODE=false`.

---

## Quick Start (Docker Compose)

```bash
# Clone the repository
git clone https://github.com/your-org/securebank-portal.git
cd securebank-portal

# Copy environment template
cp .env.example .env

# Launch containers
docker-compose up -d --build

# Run initial database seed
docker-compose exec backend python /app/../scripts/seed_data.py
```

Access the application in your browser:
- **Frontend Portal**: `http://localhost:5173` or `http://localhost`
- **Backend Swagger API Docs**: `http://localhost:8000/docs` (active when DEMO_MODE=true)

---

## Default Demo Credentials

| Role | Username | Password | Purpose |
|---|---|---|---|
| Customer | `john_doe` | `Password123!` | Primary customer testing account |
| Customer | `jane_smith` | `Password123!` | Recipient customer testing account |
| Admin | `admin` | `Password123!` | System administrator account |

---

## Architecture Diagram

```mermaid
graph TD
    Client[Browser / React Portal] -->|HTTP / REST API| Proxy[Caddy Reverse Proxy + Coraza WAF]
    Proxy -->|Filtered Traffic| FastAPI[FastAPI Backend :8000]
    FastAPI -->|ORM / SQL queries| MySQL[(MySQL 8 Database :3306)]
    FastAPI -->|Structured JSON Logs| LogFile[/app/logs/application.log]
    WazuhAgent[Wazuh Agent / Sentry Monitor] -->|File Collector| LogFile
```

---

## Documentation Links

- [Installation Guide (INSTALL.md)](./INSTALL.md)
- [API Documentation (API.md)](./API.md)
- [Database Schema (DATABASE.md)](./DATABASE.md)
- [Project Directory Structure (PROJECT_STRUCTURE.md)](./PROJECT_STRUCTURE.md)
