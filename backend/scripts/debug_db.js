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
async function runDebug() {
  console.log('\n🔍 --- DATABASE DIAGNOSTIC ---');
  try {
    const client = await pool.connect();
    console.log('✅ Koneksi Database: SUKSES');
    
    // Cek Tabel
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    if(res.rows.length === 0) {
        console.log('❌ TOTAL TABEL: 0 (Database Kosong!)');
        console.log('   Solusi: Restart server agar auto-init berjalan.');
    } else {
        console.log(`✅ TOTAL TABEL: ${res.rows.length}`);
        res.rows.forEach(t => console.log(`   - ${t.table_name}`));
        
        // Cek Permission Select
        try {
            await client.query('SELECT count(*) FROM users');
            console.log('✅ Izin Baca (SELECT): OK');
        } catch(e) { console.log(`❌ Izin Baca Failed: ${e.message}`); }
    }
    client.release();
  } catch (err) {
    console.log(`❌ Koneksi GAGAL: ${err.message}`);
    console.log('   (Cek username/password di file .env)');
  }
  console.log('-----------------------------\n');
  process.exit(0);
}
runDebug();
