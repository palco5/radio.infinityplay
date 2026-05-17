import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MariaDB connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Connected to MariaDB database');
        connection.release();
    })
    .catch(err => {
        console.error('❌ MariaDB connection error:', err.message);
    });

export default pool;
