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

async function resetAll() {
    console.log('🔄 Menghubungkan ke database...');
    try {
        const client = await pool.connect();
        console.log('✅ Terhubung.');

        const tables = [
            'counseling',
            'scores',
            'attendance',
            'journals',
            'students',
            'classes',
            'subjects',
            'users'
        ];

        console.log('💣 MENGHAPUS SEMUA TABEL...');
        for (const table of tables) {
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`✅ Tabel ${table} berhasil dihapus.`);
        }

        console.log('\n✨ Database Bersih! Jalankan server kembali untuk membuat tabel baru.');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Gagal:', err.message);
        process.exit(1);
    }
}
resetAll();
