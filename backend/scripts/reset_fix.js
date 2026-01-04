import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});
console.log('Hubungan ke database...');
pool.connect().then(client => {
    console.log('⚠️  Menghapus tabel users lama...');
    // CASCADE akan menghapus data terkait di tabel lain juga agar bersih
    return client.query('DROP TABLE IF EXISTS users CASCADE')
        .then(() => {
            console.log('✅ SUKSES! Tabel lama telah dihapus.');
            console.log('Silakan restart server eduguru sekarang.');
            client.release();
            process.exit(0);
        })
        .catch(e => {
            console.error('❌ Error:', e.message);
            process.exit(1);
        });
});
