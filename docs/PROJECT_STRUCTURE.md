# SecureBank Portal - Project Directory Structure

Complete enterprise repository layout:

```
securebank/
├── backend/
│   ├── alembic/                      # Alembic DB migration environment
│   │   ├── versions/
│   │   │   └── 001_initial_migration.py
│   │   └── env.py
│   ├── app/
│   │   ├── api/
│   │   │   ├── middleware/
│   │   │   │   ├── logging_middleware.py    # Structured log generator (/app/logs/application.log)
│   │   │   │   └── security_headers.py      # Hardening HTTP response headers
│   │   │   └── routers/
│   │   │       ├── accounts.py             # Accounts balance & lookup
│   │   │       ├── auth.py                 # JWT login, register, password reset
│   │   │       ├── beneficiaries.py        # Beneficiary management
│   │   │       ├── demo.py                 # Sentry vulnerability endpoints (DEMO_MODE)
│   │   │       ├── notifications.py        # Notification reader
│   │   │       ├── profile.py              # User profile & audit log API
│   │   │       └── transactions.py         # Fund transfers & ledger search
│   │   ├── auth/
│   │   │   └── jwt.py                      # Token encoding/decoding & get_current_user dependency
│   │   ├── core/
│   │   │   ├── config.py                   # Pydantic environment configuration
│   │   │   ├── logger.py                   # TimedRotatingFileHandler setup
│   │   │   └── security.py                 # Bcrypt hashing routines
│   │   ├── database/
│   │   │   └── session.py                  # SQLAlchemy engine & SessionLocal
│   │   ├── models/
│   │   │   └── models.py                   # SQLAlchemy ORM schemas
│   │   ├── schemas/
│   │   │   └── schemas.py                  # Pydantic request/response validation
│   │   ├── services/
│   │   │   └── banking_service.py          # Atomic transfer logic
│   │   └── main.py                         # FastAPI app entry point
│   ├── alembic.ini
│   ├── Dockerfile
│   └── requirements.txt
├── database/
│   └── init.sql                            # MySQL startup initialization script
├── docker/
│   └── docker-compose.yml                  # Docker Compose orchestration definition
├── docs/
│   ├── API.md                              # REST API endpoint reference
│   ├── DATABASE.md                         # Database schema & ERD diagram
│   ├── INSTALL.md                          # Deployment & setup guide
│   ├── PROJECT_STRUCTURE.md                # Directory organization reference
│   └── README.md                           # Documentation root index
├── frontend/
│   ├── src/
│   │   ├── components/                     # Reusable UI components
│   │   │   ├── Alert.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── TransactionTable.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx             # React Context for login state & token store
│   │   ├── pages/                          # Application view pages
│   │   │   ├── Accounts.jsx
│   │   │   ├── Beneficiaries.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DemoConsole.jsx             # Security demonstration console UI
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Transactions.jsx
│   │   │   └── Transfer.jsx
│   │   ├── services/
│   │   │   └── api.js                      # Axios instance with Bearer interceptors
│   │   ├── styles/
│   │   │   └── index.css                   # Tailwind CSS imports & scrollbars
│   │   ├── App.jsx                         # Main router layout
│   │   └── main.jsx                        # React root launcher
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── logs/
│   └── .gitkeep                            # Directory mount target for application.log
├── postman/
│   └── SecureBank_Portal.postman_collection.json # API Postman testing suite
├── scripts/
│   └── seed_data.py                        # Automated database seed generator
├── .env.example
├── docker-compose.yml
└── README.md
```
