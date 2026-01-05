import fs from 'fs';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'eduguru-secret-key-change-in-production';

// ========== GEMINI AI CLIENT ==========
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('✅ Gemini AI initialized');
} else {
  console.warn('⚠️ GEMINI_API_KEY not found. AI features disabled.');
}

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow any origin by returning it (reflect)
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ========== STATIC FILES (ROBUST PATH) ==========
const possibleDistPaths = [
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, 'dist'),
  '/www/wwwroot/eduguru/frontend/dist',
  '/www/wwwroot/EduGuru/frontend/dist'
];

let distPath = possibleDistPaths[0];
for (const p of possibleDistPaths) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    distPath = p;
    console.log(`✅ Found production dist at: ${p}`);
    break;
  }
}

app.use(express.static(distPath));
console.log(`📂 Serving static files from: ${distPath}`);

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ========== DATABASE ==========
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

let dbConnected = false;

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.log('ℹ️ Server will run in demo mode without database');
  } else {
    console.log('✅ Connected to PostgreSQL Database');
    dbConnected = true;
    release();
    // Initialize database tables
    initDB();
  }
});

// ========== DATABASE SCHEMA ==========
const initDB = async () => {
  if (!dbConnected) return;

  try {
    // Users Table with password
    await pool.query(`
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
        `);

    // Classes Table
    await pool.query(`
            CREATE TABLE IF NOT EXISTS classes (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                grade INTEGER,
                user_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

    // Students Table
    await pool.query(`
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
        `);

    // Journals Table
    await pool.query(`
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
        `);

    // Attendance Table
    await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id VARCHAR(255) PRIMARY KEY,
                date DATE NOT NULL,
                student_id VARCHAR(255),
                class_id VARCHAR(255),
                subject VARCHAR(255),
                status VARCHAR(10),
                user_id VARCHAR(255),
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

    // Scores Table
    await pool.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id VARCHAR(255) PRIMARY KEY,
                student_id VARCHAR(255),
                class_id VARCHAR(255),
                subject VARCHAR(255),
                type VARCHAR(50),
                score INTEGER,
                assessment_title VARCHAR(255),
                date DATE,
                notes TEXT,
                user_id VARCHAR(255),
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

    // Counseling Table
    await pool.query(`
            CREATE TABLE IF NOT EXISTS counseling (
                id VARCHAR(255) PRIMARY KEY,
                student_id VARCHAR(255),
                date DATE,
                type VARCHAR(50),
                notes TEXT,
                follow_up TEXT,
                ai_suggestion TEXT,
                is_private BOOLEAN DEFAULT FALSE,
                user_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

    // Subjects Table
    await pool.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                user_id VARCHAR(255),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(name, user_id)
            );
        `);

    // Create indexes  
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_journals_user ON journals(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);`);

    console.log("✅ Database tables initialized successfully.");
  } catch (err) {
    console.error("❌ Error initializing database tables:", err.message);

    // Handle permission errors gracefully
    if (err.code === '42501') {
      console.log('\n🔧 Permission Error Detected!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('The database user does not have ownership of the tables.');
      console.log('');
      console.log('To fix this, run the following SQL in your PostgreSQL:');
      console.log('');
      console.log('  -- Replace YOUR_DB_USER with your actual database username');
      console.log('  ALTER TABLE users OWNER TO YOUR_DB_USER;');
      console.log('  ALTER TABLE classes OWNER TO YOUR_DB_USER;');
      console.log('  ALTER TABLE students OWNER TO YOUR_DB_USER;');
      console.log('  ALTER TABLE journals OWNER TO YOUR_DB_USER;');
      console.log('  ALTER TABLE attendance OWNER TO YOUR_DB_USER;');
      console.log('  ALTER TABLE scores OWNER TO YOUR_DB_USER;');
      console.log('  ALTER TABLE counseling OWNER TO YOUR_DB_USER;');
      console.log('  ALTER TABLE subjects OWNER TO YOUR_DB_USER;');
      console.log('');
      console.log('Or grant all permissions:');
      console.log('  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO YOUR_DB_USER;');
      console.log('  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO YOUR_DB_USER;');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️ Server will continue but some features may not work.\n');
    }
  }
};

// ========== HELPER FUNCTIONS ==========
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const generateId = (prefix = 'id') => {
  if (prefix === 'class') {
    // Generate 6 chars ID for classes (e.g. C1A2B3)
    return 'C' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
};

// Check if database is required for an operation
const requireDB = (res) => {
  if (!dbConnected) {
    res.status(503).json({ error: 'Database not connected. Please configure DATABASE_URL or DB_* environment variables.' });
    return false;
  }
  return true;
};

// ========== AUTH MIDDLEWARE ==========
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional auth - for endpoints that work with/without auth
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Token invalid, continue without user
    }
  }
  next();
};

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { username, password, name, role = 'GURU' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (!requireDB(res)) return;

  // Check existing user
  const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existingUser.rows.length > 0) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = generateId('user');
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&background=22c55e&color=fff`;

  await pool.query(
    'INSERT INTO users (id, username, password, name, role, avatar) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, username, hashedPassword, name || username, role, avatar]
  );

  // Generate token
  const token = jwt.sign({ id: userId, username, role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    token,
    user: { id: userId, username, name: name || username, role, avatar }
  });
}));

// Login
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (!requireDB(res)) return;

  // Find user
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const user = result.rows[0];

  // Check password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Generate token
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    }
  });
}));

// Get current user profile
app.get('/api/auth/me', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const result = await pool.query('SELECT id, username, name, role, avatar FROM users WHERE id = $1', [req.user.id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(result.rows[0]);
}));

// Update user profile
app.put('/api/auth/me', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { name, avatar, currentPassword, newPassword } = req.body;

  let updateFields = [];
  let values = [];
  let paramIndex = 1;

  if (name) {
    updateFields.push(`name = $${paramIndex++}`);
    values.push(name);
  }

  if (avatar) {
    updateFields.push(`avatar = $${paramIndex++}`);
    values.push(avatar);
  }

  // Handle password change
  if (currentPassword && newPassword) {
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);

    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    updateFields.push(`password = $${paramIndex++}`);
    values.push(hashedPassword);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updateFields.push(`updated_at = NOW()`);
  values.push(req.user.id);

  await pool.query(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  const result = await pool.query('SELECT id, username, name, role, avatar FROM users WHERE id = $1', [req.user.id]);
  res.json(result.rows[0]);
}));

// ========== OAUTH ROUTES (NEW) ==========

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'; // Final URL after login

// Utility to handle OAuth Success
const handleOAuthSuccess = (res, user) => {
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  // Redirect back to frontend with token
  // If the frontend is served by this server, we redirect to /
  res.redirect(`${CLIENT_URL}/?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
};

// 1. GOOGLE OAUTH
app.get('/api/auth/google', (req, res) => {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: `${process.env.API_URL}/api/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  if (!options.client_id) return res.status(500).send('Google Client ID not configured');

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

app.get('/api/auth/google/callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  const tokenUrl = 'https://oauth2.googleapis.com/token';

  const values = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${process.env.API_URL}/api/auth/google/callback`,
    grant_type: 'authorization_code',
  };

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values),
  });

  const { access_token } = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=${access_token}`);
  const userInfo = await userRes.json();

  // Find or create user
  let userResult = await pool.query('SELECT * FROM users WHERE username = $1', [userInfo.email]);
  let user;

  if (userResult.rows.length === 0) {
    const userId = generateId('user');
    const newUser = await pool.query(
      'INSERT INTO users (id, username, password, name, role, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, name, role, avatar',
      [userId, userInfo.email, 'oauth_protected', userInfo.name, 'GURU', userInfo.picture]
    );
    user = newUser.rows[0];
  } else {
    user = userResult.rows[0];
  }

  handleOAuthSuccess(res, user);
}));

// 2. GITHUB OAUTH
app.get('/api/auth/github', (req, res) => {
  const rootUrl = 'https://github.com/login/oauth/authorize';
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.API_URL}/api/auth/github/callback`,
    scope: 'user:email',
  };

  if (!options.client_id) return res.status(500).send('GitHub Client ID not configured');

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

app.get('/api/auth/github/callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  const tokenUrl = 'https://github.com/login/oauth/access_token';

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const { access_token } = await tokenRes.json();

  // Get user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const userInfo = await userRes.json();

  // Get email (GitHub might return null email if private)
  const emailRes = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const emails = await emailRes.json();
  const primaryEmail = emails.find(e => e.primary)?.email || userInfo.email || `${userInfo.login}@github.com`;

  // Find or create user
  let userResult = await pool.query('SELECT * FROM users WHERE username = $1', [primaryEmail]);
  let user;

  if (userResult.rows.length === 0) {
    const userId = generateId('user');
    const newUser = await pool.query(
      'INSERT INTO users (id, username, password, name, role, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, name, role, avatar',
      [userId, primaryEmail, 'oauth_protected', userInfo.name || userInfo.login, 'GURU', userInfo.avatar_url]
    );
    user = newUser.rows[0];
  } else {
    user = userResult.rows[0];
  }

  handleOAuthSuccess(res, user);
}));

// 3. MICROSOFT OAUTH
app.get('/api/auth/microsoft', (req, res) => {
  const rootUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  const options = {
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${process.env.API_URL}/api/auth/microsoft/callback`,
    response_mode: 'query',
    scope: 'openid profile email User.Read',
  };

  if (!options.client_id) return res.status(500).send('Microsoft Client ID not configured');

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

app.get('/api/auth/microsoft/callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.API_URL}/api/auth/microsoft/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const { access_token } = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const userInfo = await userRes.json();

  const email = userInfo.mail || userInfo.userPrincipalName;

  // Find or create user
  let userResult = await pool.query('SELECT * FROM users WHERE username = $1', [email]);
  let user;

  if (userResult.rows.length === 0) {
    const userId = generateId('user');
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.displayName)}&background=00A4EF&color=fff`;
    const newUser = await pool.query(
      'INSERT INTO users (id, username, password, name, role, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, name, role, avatar',
      [userId, email, 'oauth_protected', userInfo.displayName, 'GURU', avatar]
    );
    user = newUser.rows[0];
  } else {
    user = userResult.rows[0];
  }

  handleOAuthSuccess(res, user);
}));

// ========== CLASSES ROUTES ==========
app.get('/api/classes', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const result = await pool.query(
    'SELECT * FROM classes WHERE user_id = $1 ORDER BY grade, name',
    [req.user.id]
  );

  const formatted = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    grade: row.grade,
    userId: row.user_id
  }));

  res.json(formatted);
}));

app.post('/api/classes', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { id: reqId, name, grade } = req.body;
  const id = reqId || generateId('class');

  await pool.query(
    'INSERT INTO classes (id, name, grade, user_id) VALUES ($1, $2, $3, $4)',
    [id, name, grade, req.user.id]
  );

  res.json({ id, name, grade, userId: req.user.id });
}));

app.post('/api/classes/bulk', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { classes } = req.body;

  if (!classes || classes.length === 0) {
    return res.json({ success: true, imported: 0 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log(`📦 Received bulk classes: ${classes.length} items for user ${req.user.id}`);
    for (const c of classes) {
      const id = c.id || generateId('class');
      console.log(`  - Processing class: ${id} (${c.name})`);
      await client.query(
        `INSERT INTO classes (id, name, grade, user_id) VALUES ($1, $2, $3, $4)
                 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, grade = EXCLUDED.grade, user_id = EXCLUDED.user_id`,
        [id, c.name, c.grade, req.user.id]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Bulk classes import completed: ${classes.length} items`);
    res.json({ success: true, imported: classes.length });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.put('/api/classes/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { name, grade } = req.body;

  await pool.query(
    'UPDATE classes SET name = $1, grade = $2 WHERE id = $3 AND user_id = $4',
    [name, grade, req.params.id, req.user.id]
  );

  res.json({ success: true });
}));

app.delete('/api/classes/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  await pool.query('DELETE FROM classes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
}));

app.delete('/api/classes', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Manual Cascade: Delete all data related to classes for this user
    // 1. Delete dependent transactional data linked to classes
    await client.query('DELETE FROM journals WHERE user_id = $1', [req.user.id]); // Journals often link to class

    // 2. Set student class_id to NULL (or delete them if preferred, but usually we just unlink)
    // If user wants "Delete All Classes", we usually just delete the classes. 
    // BUT if students are linked to classes, PostgreSQL FOREIGN KEY might block or SET NULL.
    // Let's rely on ON DELETE SET NULL defined in schema, but to be safe/clean:
    await client.query('UPDATE students SET class_id = NULL WHERE user_id = $1', [req.user.id]);

    // 3. Finally delete the classes
    await client.query('DELETE FROM classes WHERE user_id = $1', [req.user.id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ========== STUDENTS ROUTES ==========
app.get('/api/students', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { classId } = req.query;

  let query = 'SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = $1';
  let values = [req.user.id];

  if (classId) {
    query += ' AND s.class_id = $2';
    values.push(classId);
  }

  query += ' ORDER BY s.name';

  const result = await pool.query(query, values);

  const formatted = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    nis: row.nis,
    classId: row.class_id,
    className: row.class_name,
    userId: row.user_id
  }));

  res.json(formatted);
}));

app.post('/api/students', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { name, nis, classId } = req.body;
  const id = generateId('student');

  await pool.query(
    'INSERT INTO students (id, name, nis, class_id, user_id) VALUES ($1, $2, $3, $4, $5)',
    [id, name, nis, classId, req.user.id]
  );

  res.json({ id, name, nis, classId, userId: req.user.id });
}));

app.post('/api/students/bulk', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { students } = req.body;

  if (!students || students.length === 0) {
    return res.json({ success: true, imported: 0 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const s of students) {
      const id = s.id || generateId('student');
      await client.query(
        `INSERT INTO students (id, name, nis, class_id, user_id) VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, nis = EXCLUDED.nis, class_id = EXCLUDED.class_id, user_id = EXCLUDED.user_id`,
        [id, s.name, s.nis, s.classId, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, imported: students.length });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.put('/api/students/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { name, nis, classId } = req.body;

  await pool.query(
    'UPDATE students SET name = $1, nis = $2, class_id = $3 WHERE id = $4 AND user_id = $5',
    [name, nis, classId, req.params.id, req.user.id]
  );

  res.json({ success: true });
}));

app.delete('/api/students/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Manually delete dependent records to be safe
    await client.query('DELETE FROM counseling WHERE student_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    await client.query('DELETE FROM scores WHERE student_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    await client.query('DELETE FROM attendance WHERE student_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    await client.query('DELETE FROM students WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.delete('/api/students', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Manual Cascade Delete for all students of user
    await client.query('DELETE FROM counseling WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM scores WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM attendance WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM students WHERE user_id = $1', [req.user.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ========== SUBJECTS ROUTES ==========
app.get('/api/subjects', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const result = await pool.query('SELECT name FROM subjects WHERE user_id = $1 ORDER BY name', [req.user.id]);
  res.json(result.rows.map(r => r.name));
}));

app.post('/api/subjects', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { name } = req.body;

  await pool.query(
    'INSERT INTO subjects (name, user_id) VALUES ($1, $2) ON CONFLICT (name, user_id) DO NOTHING',
    [name, req.user.id]
  );

  res.json({ success: true });
}));

app.post('/api/subjects/bulk', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { subjects } = req.body;
  console.log('📦 Received bulk subjects:', subjects);

  if (!subjects || !Array.isArray(subjects)) {
    return res.status(400).json({ error: 'Data mata pelajaran tidak valid (harus array).' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const name of subjects) {
      if (!name) continue;
      const cleanName = String(name).trim();
      if (!cleanName) continue;

      await client.query(
        'INSERT INTO subjects (name, user_id) VALUES ($1, $2) ON CONFLICT (name, user_id) DO NOTHING',
        [cleanName, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, count: subjects.length });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error in /api/subjects/bulk:', e);
    throw e;
  } finally {
    client.release();
  }
}));

app.delete('/api/subjects/:name', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  await pool.query('DELETE FROM subjects WHERE name = $1 AND user_id = $2', [req.params.name, req.user.id]);
  res.json({ success: true });
}));

app.delete('/api/subjects', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM subjects WHERE user_id = $1', [req.user.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ========== JOURNALS ROUTES ==========
app.get('/api/journals', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const result = await pool.query(
    'SELECT * FROM journals WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
    [req.user.id]
  );

  const formatted = result.rows.map(row => ({
    id: row.id,
    date: row.date ? row.date.toISOString().split('T')[0] : null,
    classId: row.class_id,
    subject: row.subject,
    startTime: row.start_time,
    learningObjective: row.learning_objective,
    materials: row.materials,
    method: row.method,
    activities: row.activities,
    reflection: row.reflection,
    engagementLevel: row.engagement_level,
    userId: row.user_id,
    createdAt: parseInt(row.created_at)
  }));

  res.json(formatted);
}));

app.post('/api/journals', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { id, date, classId, subject, startTime, learningObjective, materials, method, activities, reflection, engagementLevel, createdAt } = req.body;

  const journalId = id || generateId('journal');
  const timestamp = createdAt || Date.now();

  await pool.query(
    `INSERT INTO journals (id, date, class_id, subject, start_time, learning_objective, materials, method, activities, reflection, engagement_level, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
            date = EXCLUDED.date,
            class_id = EXCLUDED.class_id,
            subject = EXCLUDED.subject,
            start_time = EXCLUDED.start_time,
            learning_objective = EXCLUDED.learning_objective,
            materials = EXCLUDED.materials,
            method = EXCLUDED.method,
            activities = EXCLUDED.activities,
            reflection = EXCLUDED.reflection,
            engagement_level = EXCLUDED.engagement_level`,
    [journalId, date, classId, subject, startTime, learningObjective, materials, method, activities, reflection, engagementLevel, req.user.id, timestamp]
  );

  res.json({ success: true, id: journalId });
}));

app.delete('/api/journals/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  await pool.query('DELETE FROM journals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
}));

// ========== ATTENDANCE ROUTES ==========
app.get('/api/attendance', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { classId, date, subject } = req.query;

  let query = 'SELECT * FROM attendance WHERE user_id = $1';
  const values = [req.user.id];

  if (classId) { values.push(classId); query += ` AND class_id = $${values.length}`; }
  if (date) { values.push(date); query += ` AND date = $${values.length}`; }
  if (subject) { values.push(subject); query += ` AND subject = $${values.length}`; }

  const result = await pool.query(query, values);

  const formatted = result.rows.map(row => ({
    id: row.id,
    date: row.date ? row.date.toISOString().split('T')[0] : null,
    studentId: row.student_id,
    classId: row.class_id,
    subject: row.subject,
    status: row.status,
    userId: row.user_id
  }));

  res.json(formatted);
}));

app.post('/api/attendance/bulk', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { records } = req.body;

  if (!records || records.length === 0) return res.json({ success: true });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const r of records) {
      const id = r.id || `${r.date}_${r.classId}_${r.subject}_${r.studentId}`;
      await client.query(
        `INSERT INTO attendance (id, date, student_id, class_id, subject, status, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
        [id, r.date, r.studentId, r.classId, r.subject, r.status, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ========== SCORES ROUTES ==========
app.get('/api/scores', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { classId, subject, type } = req.query;

  let query = 'SELECT * FROM scores WHERE user_id = $1';
  const values = [req.user.id];

  if (classId) { values.push(classId); query += ` AND class_id = $${values.length}`; }
  if (subject) { values.push(subject); query += ` AND subject = $${values.length}`; }
  if (type) { values.push(type); query += ` AND type = $${values.length}`; }

  const result = await pool.query(query, values);

  const formatted = result.rows.map(row => ({
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    subject: row.subject,
    type: row.type,
    score: row.score,
    assessmentTitle: row.assessment_title,
    date: row.date ? row.date.toISOString().split('T')[0] : null,
    notes: row.notes,
    userId: row.user_id
  }));

  res.json(formatted);
}));

app.post('/api/scores/bulk', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { scores } = req.body;

  if (!scores || scores.length === 0) return res.json({ success: true });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const s of scores) {
      const id = s.id || generateId('score');
      await client.query(
        `INSERT INTO scores (id, student_id, class_id, subject, type, score, assessment_title, date, notes, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes`,
        [id, s.studentId, s.classId, s.subject, s.type, s.score, s.assessmentTitle, s.date, s.notes, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ========== COUNSELING ROUTES ==========
app.get('/api/counseling', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { studentId } = req.query;

  let query = `
        SELECT c.*, s.name as student_name 
        FROM counseling c 
        LEFT JOIN students s ON c.student_id = s.id 
        WHERE c.user_id = $1
    `;
  const values = [req.user.id];

  if (studentId) {
    values.push(studentId);
    query += ` AND c.student_id = $${values.length}`;
  }

  query += ' ORDER BY c.date DESC';

  const result = await pool.query(query, values);

  const formatted = result.rows.map(row => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    date: row.date ? row.date.toISOString().split('T')[0] : null,
    type: row.type,
    notes: row.notes,
    followUp: row.follow_up,
    aiSuggestion: row.ai_suggestion,
    isPrivate: row.is_private,
    userId: row.user_id
  }));

  res.json(formatted);
}));

app.post('/api/counseling', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { id, studentId, date, type, notes, followUp, aiSuggestion, isPrivate } = req.body;

  const counselingId = id || generateId('counsel');

  await pool.query(
    `INSERT INTO counseling (id, student_id, date, type, notes, follow_up, ai_suggestion, is_private, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
            notes = EXCLUDED.notes,
            follow_up = EXCLUDED.follow_up,
            ai_suggestion = EXCLUDED.ai_suggestion`,
    [counselingId, studentId, date, type, notes, followUp, aiSuggestion, isPrivate || false, req.user.id]
  );

  res.json({ success: true, id: counselingId });
}));

app.delete('/api/counseling/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  await pool.query('DELETE FROM counseling WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
}));

// ========== DASHBOARD STATS ==========
app.get('/api/dashboard/stats', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const userId = req.user.id;

  // Get counts
  const studentsResult = await pool.query('SELECT COUNT(*) FROM students WHERE user_id = $1', [userId]);
  const classesResult = await pool.query('SELECT COUNT(*) FROM classes WHERE user_id = $1', [userId]);

  // Get this month's journals
  const journalsResult = await pool.query(`
        SELECT COUNT(*) FROM journals 
        WHERE user_id = $1 
        AND date >= DATE_TRUNC('month', CURRENT_DATE)
        AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `, [userId]);

  // Get recent activity
  const recentJournals = await pool.query(`
        SELECT id, date, subject FROM journals 
        WHERE user_id = $1 
        ORDER BY created_at DESC LIMIT 5
    `, [userId]);

  res.json({
    studentCount: parseInt(studentsResult.rows[0].count),
    classCount: parseInt(classesResult.rows[0].count),
    journalCount: parseInt(journalsResult.rows[0].count),
    teachingHours: parseInt(journalsResult.rows[0].count) * 2,
    recentActivity: recentJournals.rows
  });
}));

// ========== GEMINI AI ROUTES ==========

// Generate reflection for journal
app.post('/api/ai/reflection', authMiddleware, asyncHandler(async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ error: 'AI service unavailable', text: 'AI Service tidak tersedia. Silakan konfigurasi GEMINI_API_KEY.' });
  }

  const { objective, activities, engagement } = req.body;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Sebagai asisten guru profesional, buatkan paragraf refleksi singkat (maksimal 100 kata) untuk jurnal mengajar.
        
Konteks:
- Tujuan Pembelajaran: ${objective}
- Aktivitas: ${activities}
- Keterlibatan Siswa: ${engagement}

Refleksi harus mencakup apa yang berhasil dan saran perbaikan singkat untuk pertemuan berikutnya. Gunakan bahasa Indonesia formal namun luwes.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  res.json({ text });
}));

// Generate teaching method suggestions
app.post('/api/ai/teaching-methods', authMiddleware, asyncHandler(async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ error: 'AI service unavailable' });
  }

  const { topic, grade } = req.body;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Berikan 3 ide metode pembelajaran kreatif dan singkat untuk materi "${topic}" kelas ${grade}. Format: poin-poin singkat dalam bahasa Indonesia.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  res.json({ text });
}));

// Generate follow-up plan for counseling
app.post('/api/ai/follow-up', authMiddleware, asyncHandler(async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ error: 'AI service unavailable' });
  }

  const { studentName, type, notes } = req.body;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Sebagai Guru BK profesional, berikan saran "Rencana Tindak Lanjut" (RTL) yang konkret, singkat, dan solutif.
        
Data Siswa: ${studentName}
Jenis Masalah: ${type}
Catatan Konseling: ${notes}

Output maksimal 3 poin langkah praktis yang bisa dilakukan guru atau siswa selanjutnya. Gunakan bahasa Indonesia yang empatik.
PENTING: Batasi total jawaban maksimal 100 kata.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  res.json({ text });
}));

// Chat with AI
app.post('/api/ai/chat', authMiddleware, asyncHandler(async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ error: 'AI service unavailable' });
  }

  const { message, history = [] } = req.body;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: `Anda adalah Asisten Virtual EduGuru yang ramah, profesional, dan berwawasan luas. 
Tugas anda adalah membantu guru dalam:
1. Merancang strategi pembelajaran kreatif.
2. Membuat soal latihan (formatif/sumatif).
3. Memberikan saran penanganan siswa (konseling dasar).
4. Menjawab pertanyaan seputar materi pelajaran.

Gunakan bahasa Indonesia yang baik, sopan, dan mudah dipahami. Jawaban harus ringkas namun padat isi.`
  });

  const chat = model.startChat({
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  });

  const result = await chat.sendMessage(message);
  const text = result.response.text();

  res.json({ text });
}));

// ========== SYNC MASTER DATA (Legacy Support) ==========
app.post('/api/sync/master', authMiddleware, asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;

  const { students, classes, subjects } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Sync Classes
    if (classes && classes.length > 0) {
      for (const c of classes) {
        const classId = c.id || generateId('class');
        await client.query(
          `INSERT INTO classes (id, name, grade, user_id) VALUES ($1, $2, $3, $4)
                     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, grade = EXCLUDED.grade, user_id = EXCLUDED.user_id`,
          [classId, c.name, c.grade, req.user.id]
        );
      }
    }

    // Sync Students
    if (students && students.length > 0) {
      for (const s of students) {
        const studentId = s.id || generateId('student');
        await client.query(
          `INSERT INTO students (id, name, nis, class_id, user_id) VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, nis = EXCLUDED.nis, class_id = EXCLUDED.class_id, user_id = EXCLUDED.user_id`,
          [studentId, s.name, s.nis, s.classId, req.user.id]
        );
      }
    }

    // Sync Subjects
    if (subjects && subjects.length > 0) {
      for (const name of subjects) {
        await client.query(
          `INSERT INTO subjects (name, user_id) VALUES ($1, $2) ON CONFLICT (name, user_id) DO NOTHING`,
          [name, req.user.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ========== HEALTH CHECK ==========
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  if (dbConnected) {
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
    }
  }

  res.json({
    status: 'ok',
    db: dbStatus,
    ai: genAI ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========== SPA FALLBACK ==========
app.use((req, res, next) => {
  // Only serve index.html for non-API GET routes
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`❌ SPA Error: index.html not found at ${indexPath}`);
      res.status(404).send(`
        <html>
          <body style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <h2 style="color: #e11d48;">⚠️ Frontend Not Built</h2>
            <p>Server is running, but the frontend files are missing at: <br><code>${indexPath}</code></p>
            <p><strong>Solution:</strong> Run <code>npm run build</code> in the frontend folder.</p>
          </body>
        </html>
      `);
    }
  } else if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    next();
  }
});

// ========== ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error('❌ Unexpected Error:', err);

  // Log to file
  try {
    const logMsg = `\n[${new Date().toISOString()}] ${req.method} ${req.path}\n${err.stack || err}\n`;
    fs.appendFileSync(path.join(__dirname, 'ERROR_LOG.txt'), logMsg);
  } catch (e) { }

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    detail: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 EduGuru Server running on port ${PORT}`);
  console.log(`📂 Serving static files from: ${distPath}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});
// --- HEARTBEAT PATCH ---
setInterval(() => {
  // Jaga server tetap hidup
}, 10000);
console.log('💓 Heartbeat active');
