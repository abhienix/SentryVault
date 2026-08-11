#!/bin/bash
# ==============================================================================
# SentryVault Core Banking - Ubuntu Backend VM Automated Setup Script
# Run on your Ubuntu Backend VM (DMZ Network)
# ==============================================================================

set -e

echo "=== 1. Updating System & Installing Python Dependencies ==="
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv git curl mysql-client

echo "=== 2. Creating Application & Log Directories ==="
sudo mkdir -p /opt/sentryvault/backend
sudo mkdir -p /var/log/sentryvault
sudo mkdir -p /etc/sentryvault

echo "=== 3. Setting Up Virtual Environment ==="
python3 -m venv /opt/sentryvault/backend/venv
source /opt/sentryvault/backend/venv/bin/activate

echo "=== 4. Installing Python Packages ==="
pip install --upgrade pip
pip install fastapi uvicorn sqlalchemy pymysql python-jose passlib bcrypt pydantic pydantic-settings python-multipart

echo "=== 5. Setting Directory Permissions ==="
sudo chown -R www-data:www-data /opt/sentryvault
sudo chown -R www-data:www-data /var/log/sentryvault
sudo chmod 755 /var/log/sentryvault

echo "=== 6. Systemd Service Setup ==="
sudo cp sentryvault-backend.service /etc/systemd/system/sentryvault-backend.service
sudo cp backend-ubuntu.env /etc/sentryvault/backend.env

sudo systemctl daemon-reload
sudo systemctl enable sentryvault-backend
sudo systemctl restart sentryvault-backend

echo "=== Ubuntu Backend Deployment Complete! ==="
echo "Check service status: sudo systemctl status sentryvault-backend"
echo "Check log stream: tail -f /var/log/sentryvault/application.log"
