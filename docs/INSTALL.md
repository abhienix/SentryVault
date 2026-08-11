# SecureBank Portal - Installation & Deployment Guide

This guide details local development setup, containerized deployment using Docker Compose, database migration instructions, and structured log verification.

---

## System Requirements

- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Python**: 3.11+ (if running backend locally without Docker)
- **Node.js**: v18+ (if running frontend locally without Docker)
- **MySQL**: 8.0+

---

## 1. Containerized Deployment (Recommended)

### Step 1: Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

### Step 2: Build and Start Containers
```bash
docker-compose up -d --build
```
This command starts:
- `securebank_db`: MySQL 8 listening on port `3306`
- `securebank_backend`: FastAPI listening on port `8000`
- `securebank_frontend`: Nginx serving React SPA on port `80` (and `5173`)

### Step 3: Run Database Seed Script
Populate initial accounts, users, and transactions:
```bash
docker-compose exec backend python /app/../scripts/seed_data.py
```

---

## 2. Local Manual Setup (Without Docker)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Run database seed
python ../scripts/seed_data.py

# Start Uvicorn development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 3. Log Verification for Wazuh / Sentry Integration

Verify structured logs are generated continuously in `/app/logs/application.log`:

```bash
# In container:
docker-compose exec backend cat /app/logs/application.log

# Expected JSON sample output:
# {"timestamp": "2026-08-10T04:00:00Z", "level": "INFO", "logger": "securebank", "message": "GET /api/v1/accounts/ -> 200 (12.4ms)", "source_ip": "127.0.0.1", "http_method": "GET", "endpoint": "/api/v1/accounts/", "status_code": 200, "username": "john_doe", "response_time": "12.4ms", "user_agent": "Mozilla/5.0..."}
```
