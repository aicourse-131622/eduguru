import pg from 'pg';
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
async function reset() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Menghapus tabel users lama...');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✅ Tabel users Berhasil Dihapus!');
  } catch (e) { console.error('❌ Gagal:', e.message); }
  client.release();
  process.exit(0);
}
reset();
