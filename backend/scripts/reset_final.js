import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});
async function reset() {
    console.log('🔄 Menghubungkan ke database...');
    try {
        const client = await pool.connect();
        console.log('✅ Terhubung.');
        
        console.log('💣 MENGHAPUS tabel users...');
        await client.query('DROP TABLE IF EXISTS users CASCADE');
        console.log('✅ Tabel users BERHASIL dihapus.');
        
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Gagal:', err.message);
        process.exit(1);
    }
}
reset();
