// server.js
const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based version
const path = require('path');

const app = express();
const port = 3000; // You can change this port if needed

// --- Database Configuration ---
// IMPORTANT: Replace with your actual MySQL connection details
// Consider using environment variables for security in a real application
const dbConfig = {
    host: 'localhost', // Or '192.168.193.1' if Node server is not on the same machine as MySQL
    user: 'root',
    password: '2005',
    database: 'depragdata1' // <<< Updated database name
};

// --- MySQL Connection Pool ---
// Using a pool is better for handling multiple connections
let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log('MySQL Connection Pool created successfully.');
} catch (error) {
    console.error('Error creating MySQL connection pool:', error);
    // Exit if the pool cannot be created, as the app depends on it
    process.exit(1);
}


// --- Middleware ---
// Serve static files (HTML, CSS, JS, images) from the project directory
app.use(express.static(path.join(__dirname)));

// --- API Endpoint ---
app.get('/api/screws', async (req, res) => {
    console.log('Received request for /api/screws');
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Acquired connection from pool.');

        // Fetch data from the screw_results table, mapping columns to frontend names
        const [rows] = await connection.query(
            'SELECT step_id as id, angle_low_limit as angleMin, angle_high_limit as angleMax, angle_result as actualAngle, torque_low_limit as torqueMin, torque_high_limit as torqueMax, torque_result as actualTorque FROM screw_results ORDER BY step_id ASC'
        );

        console.log(`Fetched ${rows.length} rows from the database.`);
        res.json(rows); // Send data as JSON

    } catch (error) {
        console.error('Error fetching screw data from database:', error);
        res.status(500).json({ error: 'Failed to retrieve screw data from database.' });
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
            console.log('Released connection back to pool.');
        }
    }
});

// --- Serve the main HTML file for the root path ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Make sure your MySQL server is running and accessible.');
    console.log('Ensure you have replaced placeholder database credentials and table name in server.js.');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server and DB pool');
    if (pool) {
        await pool.end();
        console.log('MySQL pool closed.');
    }
    process.exit(0);
});