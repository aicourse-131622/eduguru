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

async function checkSchema() {
    try {
        const client = await pool.connect();
        console.log('--- TABLE: subjects ---');
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'subjects';
        `);
        console.table(res.rows);

        console.log('--- CONSTRAINTS on subjects ---');
        const res2 = await client.query(`
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_namespace n ON n.oid = c.connamespace 
            WHERE conrelid = 'subjects'::regclass;
        `);
        console.table(res2.rows);

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error checking schema:', err.message);
        process.exit(1);
    }
}
checkSchema();
