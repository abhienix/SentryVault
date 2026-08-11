#!/bin/bash
# ==============================================================================
# SentryVault Core Banking - Debian Frontend VM Automated Setup Script
# Run on your Debian Frontend VM (DMZ Network)
# ==============================================================================

set -e

echo "=== 1. Updating System & Installing Nginx ==="
sudo apt-get update
sudo apt-get install -y nginx curl git

echo "=== 2. Creating Web Directory ==="
sudo mkdir -p /var/www/sentryvault/dist

echo "=== 3. Copying Nginx Configuration ==="
sudo cp nginx-debian-frontend.conf /etc/nginx/sites-available/sentryvault
sudo ln -sf /etc/nginx/sites-available/sentryvault /etc/nginx/sites-enabled/default

echo "=== 4. Testing & Restarting Nginx ==="
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "=== Debian Frontend Deployment Complete! ==="
echo "Static assets folder: /var/www/sentryvault/dist"
echo "Check Nginx status: sudo systemctl status nginx"
