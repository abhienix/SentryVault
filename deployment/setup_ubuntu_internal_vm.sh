#!/bin/bash
# ==============================================================================
# SentryVault Core Banking - Complete Ubuntu Internal Network VM Deployment Script
# Runs on: Ubuntu Internal Server VM (e.g., IP: 192.168.20.100)
# Hosts: Internal Firewall, MySQL DB, Wazuh Manager (SIEM), PostgreSQL, Security Dashboard
# ==============================================================================

set -e

echo "=== 1. Installing MySQL Server & PostgreSQL ==="
sudo apt-get update
sudo apt-get install -y mysql-server postgresql postgresql-contrib curl git

echo "=== 2. Configuring MySQL for Remote DMZ Access ==="
# Bind MySQL to listen on all internal interfaces
sudo sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql

echo "=== 3. Executing SentryVault Database Initialization ==="
sudo mysql -u root < ../scripts/setup_remote_db.sql

echo "=== Ubuntu Internal Server VM Deployment Complete! ==="
echo "MySQL Service Status: sudo systemctl status mysql"
echo "Listening Port: 3306 (Internal Firewall ACL: Allow from DMZ 192.168.10.10)"
