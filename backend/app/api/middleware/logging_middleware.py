import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt
from app.core.config import settings
from app.core.logger import app_logger

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that captures detailed request metrics and security audit information.
    Writes structured records formatted for security analysis / Wazuh.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Extract Client IP (handles X-Forwarded-For if behind reverse proxy like Caddy)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            source_ip = forwarded.split(",")[0].strip()
        else:
            source_ip = request.client.host if request.client else "127.0.0.1"

        user_agent = request.headers.get("user-agent", "Unknown")

        # Try extracting username from JWT Authorization header if present
        username = "anonymous"
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                username = payload.get("sub", "anonymous")
            except Exception:
                username = "invalid_token"

        response = await call_next(request)
        process_time = round((time.time() - start_time) * 1000, 2) # in ms

        # Log structured details
        log_extra = {
            "source_ip": source_ip,
            "http_method": request.method,
            "endpoint": request.url.path,
            "status_code": response.status_code,
            "username": username,
            "response_time": f"{process_time}ms",
            "user_agent": user_agent
        }

        log_message = f"{request.method} {request.url.path} -> {response.status_code} ({process_time}ms)"

        if response.status_code >= 500:
            app_logger.error(log_message, extra=log_extra)
        elif response.status_code >= 400:
            app_logger.warning(log_message, extra=log_extra)
        else:
            app_logger.info(log_message, extra=log_extra)

        return response
