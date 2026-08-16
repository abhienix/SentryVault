import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.core.logger import app_logger
from app.api.middleware.logging_middleware import StructuredLoggingMiddleware
from app.api.middleware.security_headers import SecurityHeadersMiddleware

from app.api.routers import auth, accounts, transactions, beneficiaries, profile, notifications, demo, admin, soc
from app.database.session import engine, Base

# Create tables automatically on startup if using SQLite/local dev without migrations
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs" if settings.DEMO_MODE else None,
    redoc_url="/redoc" if settings.DEMO_MODE else None,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS if isinstance(settings.BACKEND_CORS_ORIGINS, list) else [
        "http://localhost:3000", "http://localhost:5173", "http://localhost:80", "http://localhost",
        "http://192.168.20.10", "http://192.168.20.10:3000", "http://192.168.20.10:8000",
        "http://192.168.10.10", "http://192.168.10.10:3000", "http://192.168.10.10:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(StructuredLoggingMiddleware)

# Exception Handlers for standard error responses
@app.exception_handler(400)
async def custom_400_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"success": False, "error": "Bad Request", "detail": str(exc.detail if hasattr(exc, 'detail') else exc)}
    )

@app.exception_handler(401)
async def custom_401_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"success": False, "error": "Unauthorized", "detail": str(exc.detail if hasattr(exc, 'detail') else exc)}
    )

@app.exception_handler(403)
async def custom_403_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"success": False, "error": "Forbidden", "detail": str(exc.detail if hasattr(exc, 'detail') else exc)}
    )

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"success": False, "error": "Not Found", "detail": str(exc.detail if hasattr(exc, 'detail') else "The requested endpoint or resource was not found")}
    )

@app.exception_handler(500)
async def custom_500_handler(request: Request, exc):
    app_logger.error(f"Internal Server Error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "error": "Internal Server Error", "detail": "An unexpected error occurred on the server."}
    )

# Include Routers under API_V1_STR
api_v1 = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1)
app.include_router(accounts.router, prefix=api_v1)
app.include_router(transactions.router, prefix=api_v1)
app.include_router(beneficiaries.router, prefix=api_v1)
app.include_router(profile.router, prefix=api_v1)
app.include_router(notifications.router, prefix=api_v1)
app.include_router(admin.router, prefix=api_v1)
app.include_router(soc.router, prefix=api_v1)

# Include Demo Router (Handles DEMO_MODE checks internally)
app.include_router(demo.router)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "status": "ONLINE",
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
