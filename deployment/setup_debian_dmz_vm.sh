#!/bin/bash
# ==============================================================================
# SentryVault Core Banking - Complete Debian DMZ Host VM Deployment Script
# Runs on: Debian DMZ VM (e.g., IP: 192.168.10.10)
# Hosts: Suricata IDS, Caddy + Coraza WAF, FastAPI + React App, Wazuh Agent
# ==============================================================================

set -e

echo "=== 1. Installing DMZ Base Dependencies ==="
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv caddy curl git mysql-client

echo "=== 2. Creating Application & Log Directories ==="
sudo mkdir -p /opt/sentryvault/backend
sudo mkdir -p /var/www/sentryvault/dist
sudo mkdir -p /var/log/sentryvault
sudo mkdir -p /var/log/caddy
sudo mkdir -p /etc/sentryvault

echo "=== 3. Setting Up Virtual Environment & Installing Backend Dependencies ==="
python3 -m venv /opt/sentryvault/backend/venv
source /opt/sentryvault/backend/venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn sqlalchemy pymysql python-jose passlib bcrypt pydantic pydantic-settings python-multipart

echo "=== 4. Setting Permissions ==="
sudo chown -R www-data:www-data /opt/sentryvault
sudo chown -R www-data:www-data /var/www/sentryvault
sudo chown -R www-data:www-data /var/log/sentryvault

echo "=== 5. Deploying Systemd Service & Environment Config ==="
sudo cp sentryvault-backend.service /etc/systemd/system/sentryvault-backend.service
sudo cp backend-debian-dmz.env /etc/sentryvault/backend.env
sudo cp caddy-debian-dmz.Caddyfile /etc/caddy/Caddyfile

sudo systemctl daemon-reload
sudo systemctl enable sentryvault-backend
sudo systemctl restart sentryvault-backend
sudo systemctl restart caddy

echo "=== Debian DMZ Host Deployment Complete! ==="
echo "FastAPI Backend Status: sudo systemctl status sentryvault-backend"
echo "Caddy Server Status: sudo systemctl status caddy"
echo "Application Logs: /var/log/sentryvault/application.log"
