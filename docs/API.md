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
