import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});
async function test() {
  console.log('🚀 Memulai Simulasi Register...');
  const client = await pool.connect();
  
  try {
    const username = 'testuser_' + Date.now();
    const password = 'password123';
    
    console.log('1. Hashing Password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Hash OK');
    console.log('2. Inserting to Database...');
    const id = 'user_' + Date.now();
    const avatar = 'https://ui-avatars.com/api/?name=Test';
    
    await client.query(
      'INSERT INTO users (id, username, password, name, role, avatar) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, username, hashedPassword, 'Test User', 'GURU', avatar]
    );
    console.log('✅ INSERT SUKSES! Database berfungsi normal.');
    
  } catch(e) {
    console.error('\n❌ ERROR DITEMUKAN:');
    console.error(e.message);
    if(e.detail) console.error('Detail:', e.detail);
    if(e.hint) console.error('Hint:', e.hint);
  }
  
  client.release();
  process.exit(0);
}
test();
