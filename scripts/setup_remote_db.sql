-- =========================================================
-- SentryVault Core Banking - External MySQL Database Setup
-- Run this script on your Internal Network Database Virtual Machine (VM)
-- =========================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS sentryvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Create Database User for DMZ FastAPI Application
-- Replace '192.168.1.%' with your DMZ App Server Subnet/IP
CREATE USER IF NOT EXISTS 'sentryuser'@'%' IDENTIFIED BY 'SecureDbPassword123!';

-- 3. Grant Permissions
GRANT ALL PRIVILEGES ON sentryvault.* TO 'sentryuser'@'%';
FLUSH PRIVILEGES;

-- =========================================================
-- Verification Query
-- =========================================================
USE sentryvault;
SELECT "SentryVault Database Initialized Successfully" AS status;
