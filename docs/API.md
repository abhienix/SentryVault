# SecureBank Portal - API Documentation

Base URL: `http://localhost:8000/api/v1`

All protected endpoints require HTTP header:
`Authorization: Bearer <jwt_access_token>`

---

## 1. Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Request Body**:
```json
{
  "username": "john_doe",
  "email": "john.doe@gmail.com",
  "full_name": "John Doe",
  "phone": "+1-555-0101",
  "password": "Password123!"
}
```
- **Response** `201 Created`: User object + auto-generated savings account (`309...`).

### Login
- **POST** `/auth/login`
- **Request Body**:
```json
{
  "username": "john_doe",
  "password": "Password123!"
}
```
- **Response** `200 OK`:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": { ... }
}
```

### Get Current User Profile
- **GET** `/auth/me`
- **Header**: `Authorization: Bearer <token>`
- **Response** `200 OK`: User details object.

---

## 2. Accounts Endpoints

### Get User Accounts
- **GET** `/accounts/`
- **Response** `200 OK`: Array of accounts belonging to authenticated user.

### Get Account Details by ID
- **GET** `/accounts/{account_id}`
- **Response** `200 OK`: Account object with IFSC, branch, type, and balance.

---

## 3. Transactions Endpoints

### Transfer Funds
- **POST** `/transactions/transfer`
- **Request Body**:
```json
{
  "source_account_number": "3090001001",
  "target_account_number": "3090001003",
  "amount": 150.00,
  "description": "Payment for invoice"
}
```
- **Response** `201 Created`: Transaction object with `transaction_ref`.

### Transaction History
- **GET** `/transactions/history?limit=50&offset=0`
- **Response** `200 OK`: Array of transactions sorted by date descending.

### Search & Filter Transactions
- **GET** `/transactions/search?q=Invoice&min_amount=100&start_date=2026-01-01`
- **Response** `200 OK`: Filtered transactions array.

---

## 4. Beneficiaries Endpoints

### List Beneficiaries
- **GET** `/beneficiaries/`

### Add Beneficiary
- **POST** `/beneficiaries/`
- **Request Body**:
```json
{
  "name": "Jane Smith",
  "account_number": "3090001003",
  "bank_name": "SecureBank",
  "ifsc_code": "SBIN0001234",
  "nickname": "Jane Savings"
}
```

### Delete Beneficiary
- **DELETE** `/beneficiaries/{id}`

---

## 5. Demo Vulnerability Endpoints (Active when DEMO_MODE=true)

| Endpoint | Method | Vulnerability Demonstrated | Sample Query |
|---|---|---|---|
| `/demo/search` | `GET` | SQL Injection (Raw concatenation) | `?q=' OR '1'='1` |
| `/demo/search-xss` | `GET` | Reflected XSS (Unsanitized HTML) | `?q=<script>alert(1)</script>` |
| `/demo/login` | `POST` | Brute Force (No rate limiting/lockout) | `{"username":"admin","password":"bad"}` |
| `/demo/statement` | `GET` | Path Traversal (Arbitrary file read) | `?file=../../../etc/passwd` |

*Note: When `DEMO_MODE=false`, all `/demo/*` endpoints return `404 Not Found`.*

---

## 6. Security Operations Center (SOC) Endpoints

Prefix: `/api/v1/soc`

All protected SOC endpoints require administrator privileges (`role === "ADMIN"`).

### 6.1 Get Threat Events
- **GET** `/soc/threats`
- **Header**: `Authorization: Bearer <admin_token>`
- **Query Params**: `limit` (default 50), `offset` (default 0), `severity` (CRITICAL,HIGH,MEDIUM,LOW), `source_ip`, `threat_type`
- **Response** `200 OK`: Array of threat event objects from PostgreSQL `sentry_security`.

### 6.2 Get Quarantined / Blocked IPs
- **GET** `/soc/blocked-ips`
- **Header**: `Authorization: Bearer <admin_token>`
- **Query Params**: `include_inactive` (boolean, default false)
- **Response** `200 OK`: Array of active blocked IP records.

### 6.3 Quarantine IP Address
- **POST** `/soc/block-ip`
- **Header**: `Authorization: Bearer <admin_token>`
- **Request Body**:
```json
{
  "ip_address": "192.168.10.99",
  "reason": "Suspicious brute force attack"
}
```
- **Action**: Validates IP, inserts record into PostgreSQL `blocked_ips`, and executes `soc_automation.py --block-ip` to add an `iptables` DROP rule.
- **Response** `200 OK`: Blocked IP record object.

### 6.4 Unblock / Remove IP from Quarantine
- **POST** `/soc/unblock-ip`
- **Header**: `Authorization: Bearer <admin_token>`
- **Request Body**:
```json
{
  "ip_address": "192.168.10.99"
}
```
- **Action**: Updates PostgreSQL `blocked_ips` `active=FALSE` and executes `soc_automation.py --unblock-ip` to delete `iptables` DROP rule.
- **Response** `200 OK`: `{"success": true, "message": "IP ... removed from quarantine."}`

### 6.5 Get WAF Alerts
- **GET** `/soc/waf-alerts`
- **Header**: `Authorization: Bearer <admin_token>`
- **Query Params**: `limit` (default 50), `blocked_only` (boolean)
- **Response** `200 OK`: Array of Coraza/Caddy WAF alert records.

### 6.6 Infrastructure Health Check
- **GET** `/soc/health-check`
- **Auth**: Public (No token required)
- **Action**: Performs TCP socket ping tests for MySQL (3306), PostgreSQL (5432), Wazuh API (55000), Internal Host (8000), and DMZ Host (8000).
- **Response** `200 OK`:
```json
{
  "timestamp": "2026-08-16T12:00:00Z",
  "overall_status": "ALL_GREEN",
  "services": [
    { "name": "MySQL DB", "connected": true, "latency_ms": 1.2 },
    { "name": "PostgreSQL SOC", "connected": true, "latency_ms": 2.1 },
    { "name": "Wazuh Manager", "connected": true, "latency_ms": 0.8 },
    { "name": "Internal Host", "connected": true, "latency_ms": 0.4 },
    { "name": "DMZ FastAPI", "connected": true, "latency_ms": 1.7 }
  ]
}
```

### 6.7 Banking & Security Unified KPIs
- **GET** `/soc/banking-kpis`
- **Header**: `Authorization: Bearer <admin_token>`
- **Response** `200 OK`:
```json
{
  "total_deposits": 450408.73,
  "total_accounts": 10,
  "total_users": 4,
  "active_accounts": 10,
  "transactions_24h": 0,
  "total_transactions": 100,
  "threat_events_total": 8,
  "active_blocked_ips": 3
}
```

