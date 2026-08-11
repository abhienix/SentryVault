# SecureBank Portal - Database Architecture

Database Engine: **MySQL 8.0**
ORM: **SQLAlchemy 2.0**
Migrations: **Alembic**

---

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ accounts : "owns"
    users ||--o{ beneficiaries : "manages"
    users ||--o{ notifications : "receives"
    users ||--o{ audit_logs : "triggers"
    accounts ||--o{ transactions : "source account"
    accounts ||--o{ transactions : "target account"

    users {
        int id PK
        string username UK
        string email UK
        string hashed_password
        string full_name
        string phone
        boolean is_active
        string role
        datetime created_at
        datetime updated_at
    }

    accounts {
        int id PK
        int user_id FK
        string account_number UK
        string account_type
        float balance
        string currency
        string ifsc_code
        string branch_name
        string status
        datetime created_at
    }

    transactions {
        int id PK
        string transaction_ref UK
        int source_account_id FK
        int target_account_id FK
        float amount
        string transaction_type
        string description
        string status
        datetime created_at
    }

    beneficiaries {
        int id PK
        int user_id FK
        string name
        string account_number
        string bank_name
        string ifsc_code
        string nickname
        datetime created_at
    }

    notifications {
        int id PK
        int user_id FK
        string title
        string message
        boolean is_read
        string type
        datetime created_at
    }

    audit_logs {
        int id PK
        int user_id FK
        string action
        string ip_address
        string user_agent
        string details
        datetime created_at
    }
```

---

## Tables Overview

### 1. `users`
- Primary Table storing authentication credentials and profile information.
- Password hashes use **bcrypt** cost factor 12.
- Roles: `ADMIN`, `CUSTOMER`.

### 2. `accounts`
- Financial accounts tied to a user.
- Account types: `SAVINGS`, `CURRENT`.
- Account numbers: Unique 10-digit format (`3090001001`).

### 3. `transactions`
- Financial ledger records.
- Foreign keys link to `source_account_id` and `target_account_id`.
- Composite Index: `idx_transaction_search (created_at, amount)`.

### 4. `beneficiaries`
- Address book of transfer recipients created by users.

### 5. `notifications`
- In-app alerts (Transaction alerts, security notices, system info).

### 6. `audit_logs`
- Security event logging (Logins, password changes, fund transfers, configuration updates).
