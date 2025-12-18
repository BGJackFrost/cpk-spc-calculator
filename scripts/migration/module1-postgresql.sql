-- ============================================================
-- PostgreSQL Migration Script - Module 1: Core Authentication
-- ============================================================
-- Phiên bản: 1.0
-- Ngày tạo: 19/12/2024
-- Mô tả: Migration các bảng Core Authentication từ MySQL sang PostgreSQL
-- ============================================================

-- Bước 1: Tạo bảng users (Manus OAuth users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    open_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(512),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index cho users
CREATE INDEX idx_users_open_id ON users(open_id);
CREATE INDEX idx_users_role ON users(role);

-- Bước 2: Tạo bảng local_users (Local authentication)
CREATE TABLE IF NOT EXISTS local_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index cho local_users
CREATE INDEX idx_local_users_username ON local_users(username);
CREATE INDEX idx_local_users_email ON local_users(email);
CREATE INDEX idx_local_users_role ON local_users(role);

-- Bước 3: Tạo bảng login_history
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    local_user_id INTEGER REFERENCES local_users(id) ON DELETE CASCADE,
    login_type VARCHAR(20) NOT NULL CHECK (login_type IN ('oauth', 'local')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    logout_at TIMESTAMP WITH TIME ZONE,
    session_duration INTEGER, -- in seconds
    CONSTRAINT chk_user_type CHECK (
        (user_id IS NOT NULL AND local_user_id IS NULL) OR
        (user_id IS NULL AND local_user_id IS NOT NULL)
    )
);

-- Index cho login_history
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_local_user_id ON login_history(local_user_id);
CREATE INDEX idx_login_history_login_at ON login_history(login_at);

-- ============================================================
-- Trigger để tự động cập nhật updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_local_users_updated_at
    BEFORE UPDATE ON local_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Data Migration Script (chạy sau khi tạo bảng)
-- ============================================================
-- INSERT INTO users (open_id, name, avatar, role, created_at, updated_at)
-- SELECT open_id, name, avatar, role, created_at, updated_at
-- FROM mysql_users;

-- INSERT INTO local_users (username, password_hash, email, full_name, role, is_active, last_login, created_at, updated_at)
-- SELECT username, password_hash, email, full_name, role, is_active = 1, last_login, created_at, updated_at
-- FROM mysql_local_users;

-- INSERT INTO login_history (user_id, local_user_id, login_type, ip_address, user_agent, login_at, logout_at, session_duration)
-- SELECT user_id, local_user_id, login_type, ip_address, user_agent, login_at, logout_at, session_duration
-- FROM mysql_login_history;

-- ============================================================
-- Verification Queries
-- ============================================================
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM local_users;
-- SELECT COUNT(*) FROM login_history;

-- ============================================================
-- Rollback Script (nếu cần)
-- ============================================================
-- DROP TABLE IF EXISTS login_history CASCADE;
-- DROP TABLE IF EXISTS local_users CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
