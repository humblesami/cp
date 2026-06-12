import { Pool } from 'pg';

// Using a global variable in development to prevent hot-reloads 
// from constantly creating new connection pools.
let pool;

if (process.env.NODE_ENV === 'production') {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
} else {
    if (!global.pgPool) {
        global.pgPool = new Pool({
            connectionString: process.env.DATABASE_URL || "postgres://odoo:123@localhost:5440/courtpiece",
        });
    }
    pool = global.pgPool;
}

export async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
}

export { pool };
