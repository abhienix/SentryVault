-- SecureBank Portal Database Initialization Script
CREATE DATABASE IF NOT EXISTS securebank_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE securebank_db;

-- Grant Privileges
GRANT ALL PRIVILEGES ON securebank_db.* TO 'securebank_user'@'%';
FLUSH PRIVILEGES;
