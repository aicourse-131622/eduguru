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

const resetDb = async () => {
    try {
        console.log('🔄 Connecting to database...');
        const client = await pool.connect();
        
        console.log('⚠️  DROPPING USERS TABLE...');
        // This drops the old users table so the server can recreate it with new columns
        await client.query('DROP TABLE IF EXISTS users CASCADE');
        
        console.log('✅ Users table dropped. Restart the server to recreate it.');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

resetDb();
