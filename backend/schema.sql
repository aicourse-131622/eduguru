-- ============================================
-- EDUGURU DATABASE SCHEMA
-- PostgreSQL
-- ============================================
-- Run this script to initialize the database manually
-- The server will auto-create tables, but this is useful for reference

-- Enable UUID extension (optional)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'GURU',
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    grade INTEGER,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nis VARCHAR(50),
    class_id VARCHAR(255),
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(name, user_id)
);

-- ============================================
-- JOURNALS TABLE (Jurnal Mengajar)
-- ============================================
CREATE TABLE IF NOT EXISTS journals (
    id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    class_id VARCHAR(255),
    subject VARCHAR(255),
    start_time VARCHAR(50),
    learning_objective TEXT,
    materials TEXT,
    method VARCHAR(100),
    activities TEXT,
    reflection TEXT,
    engagement_level VARCHAR(100),
    user_id VARCHAR(255),
    created_at BIGINT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- ATTENDANCE TABLE (Absensi Siswa)
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    student_id VARCHAR(255),
    class_id VARCHAR(255),
    subject VARCHAR(255),
    status VARCHAR(10), -- H (Hadir), S (Sakit), I (Izin), A (Alpha)
    user_id VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- SCORES TABLE (Nilai Siswa)
-- ============================================
CREATE TABLE IF NOT EXISTS scores (
    id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255),
    class_id VARCHAR(255),
    subject VARCHAR(255),
    type VARCHAR(50), -- FORMATIVE, SUMMATIVE, STS, SAS, PORTFOLIO
    score INTEGER,
    assessment_title VARCHAR(255),
    date DATE,
    notes TEXT,
    user_id VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- COUNSELING TABLE (Bimbingan Konseling)
-- ============================================
CREATE TABLE IF NOT EXISTS counseling (
    id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255),
    date DATE,
    type VARCHAR(50), -- AKADEMIK, PERILAKU, PRIBADI, SOSIAL
    notes TEXT,
    follow_up TEXT,
    ai_suggestion TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_journals_user ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_date ON journals(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_counseling_user ON counseling(user_id);
CREATE INDEX IF NOT EXISTS idx_counseling_student ON counseling(student_id);

-- ============================================
-- SEED DATA (Optional - Demo Users)
-- ============================================
-- To create a demo user, run:
-- Password: demo123 (hashed with bcrypt)
-- INSERT INTO users (id, username, password, name, role, avatar) 
-- VALUES (
--     'user_demo_001',
--     'demo@eduguru.com',
--     '$2a$10$example_hashed_password_here',
--     'Guru Demo',
--     'GURU',
--     'https://ui-avatars.com/api/?name=Guru+Demo&background=22c55e&color=fff'
-- );
