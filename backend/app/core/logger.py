import os
import json
import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime
from app.core.config import settings

class StructuredJsonFormatter(logging.Formatter):
    """
    Structured JSON log formatter.
    Outputs log records formatted specifically for security monitoring & Wazuh ingestion.
    """
    def format(self, record):
        log_object = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Attach structured HTTP/Security metadata if present in extra record
        for key in ["source_ip", "http_method", "endpoint", "status_code", "username", "response_time", "user_agent", "action_details"]:
            if hasattr(record, key):
                log_object[key] = getattr(record, key)
                
        return json.dumps(log_object)

def setup_logger() -> logging.Logger:
    logger = logging.getLogger("securebank")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    logger.propagate = False
    
    # Avoid adding duplicate handlers if logger is already configured
    if logger.handlers:
        return logger

    # Resolve log file path
    log_path = settings.LOG_FILE_PATH
    log_dir = os.path.dirname(log_path)
    
    try:
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
    except Exception:
        # Fallback to local logs directory if /app/logs is not writable (e.g. outside container)
        log_dir = os.path.abspath("logs")
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, "application.log")

    formatter = StructuredJsonFormatter()

    # File Handler (Daily Rotation, keeps 30 days)
    try:
        file_handler = TimedRotatingFileHandler(
            filename=log_path,
            when="midnight",
            interval=1,
            backupCount=30,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not create TimedRotatingFileHandler for {log_path}: {e}")

    # Console Handler (for Docker stdout logs)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)

    return logger

app_logger = setup_logger()
