import os
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import LoginRequest, Token
from app.core.security import verify_password
from app.auth.jwt import create_access_token
from app.core.logger import app_logger

router = APIRouter(prefix="/demo", tags=["Demo Mode (Vulnerable Endpoints)"])

def verify_demo_enabled():
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo mode is disabled on this server."
        )

@router.get("/status")
def get_demo_status():
    return {
        "demo_mode": settings.DEMO_MODE,
        "message": "Demo mode is active for security monitoring demonstration." if settings.DEMO_MODE else "Demo mode is disabled."
    }

# 1. SQL Injection Demo
@router.get("/search")
def demo_sql_injection(
    q: str = Query(..., description="Unsafe search query parameter"),
    db: Session = Depends(get_db)
):
    verify_demo_enabled()
    # Intentionally vulnerable raw string concatenation SQL query for demonstration purposes
    raw_query = f"SELECT id, username, email, full_name, role FROM users WHERE username LIKE '%{q}%' OR email LIKE '%{q}%'"
    
    app_logger.warning(f"DEMO SQLi Executed: {raw_query}", extra={"endpoint": "/demo/search", "action_details": "SQLi_TEST"})

    try:
        result = db.execute(text(raw_query))
        rows = result.fetchall()
        users_list = []
        for r in rows:
            users_list.append({
                "id": r[0],
                "username": r[1],
                "email": r[2],
                "full_name": r[3],
                "role": r[4]
            })
        return {
            "vulnerability": "SQL Injection (Unsafe Concatenation)",
            "query_executed": raw_query,
            "results": users_list
        }
    except Exception as e:
        return {
            "vulnerability": "SQL Injection (Error Exposed)",
            "query_executed": raw_query,
            "sql_error": str(e)
        }

# 2. Reflected XSS Demo
@router.get("/xss", response_class=HTMLResponse)
@router.get("/search-xss", response_class=HTMLResponse)
def demo_reflected_xss(
    q: str = Query(..., description="Reflected input query")
):
    verify_demo_enabled()
    app_logger.warning(f"DEMO XSS Executed with payload: {q}", extra={"endpoint": "/demo/xss", "action_details": "XSS_TEST"})
    
    # Intentionally returns raw unsanitized query string inside HTML output
    html_content = f"""
    <!畳DOCTYPE html>
    <html>
    <head>
        <title>SecureBank Demo - Search Results</title>
        <style>
            body {{ font-family: sans-serif; padding: 2rem; background: #f8fafc; color: #1e293b; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
            .search-term {{ color: #2563eb; font-weight: bold; }}
            .alert {{ background: #fef2f2; border: 1px solid #fca5a5; padding: 1rem; border-radius: 6px; margin-top: 1rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Search Results</h2>
            <p>You searched for: <span class="search-term">{q}</span></p>
            <div class="alert">
                <strong>Demonstration Warning:</strong> This endpoint reflects input directly into the DOM without HTML escaping.
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

# 3. Brute Force Demo
@router.post("/login")
def demo_brute_force_login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    verify_demo_enabled()
    # Intentionally lacks rate limiting, lockout, or delays
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        app_logger.warning(f"DEMO BruteForce Failed attempt for {login_data.username}", extra={"endpoint": "/demo/login", "username": login_data.username})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials (No lockout active)"
        )

    access_token = create_access_token(data={"sub": user.username, "role": user.role, "user_id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Demo login successful (Vulnerable to unlimited attempts)"
    }

# 4. Path Traversal Demo
@router.get("/statement")
def demo_path_traversal(
    file: str = Query(..., description="File name parameter e.g. ../../../etc/passwd or application.log")
):
    verify_demo_enabled()
    app_logger.warning(f"DEMO Path Traversal attempt for file: {file}", extra={"endpoint": "/demo/statement", "action_details": "PATH_TRAVERSAL_TEST"})
    
    # Intentionally allows arbitrary file paths without sanitizing '..' or root paths
    base_dir = os.path.dirname(settings.LOG_FILE_PATH)
    target_file = os.path.join(base_dir, file)
    
    try:
        if not os.path.exists(target_file):
            # Attempt direct path read if relative path fails
            target_file = file

        with open(target_file, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        return {
            "vulnerability": "Path Traversal (Arbitrary File Read)",
            "requested_file": file,
            "resolved_path": target_file,
            "content": content[:5000] # Return first 5000 chars
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed reading file path '{file}': {str(e)}"
        )
