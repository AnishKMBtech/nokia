// server.js
const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based version
const path = require('path');
const nodemailer = require('nodemailer'); // Added nodemailer

const app = express();
const port = 3000; // You can change this port if needed

// --- Database Configuration ---
// IMPORTANT: Replace with your actual MySQL connection details
// Consider using environment variables for security in a real application
const dbConfig = {
    host: '192.168.193.1', // Or '192.168.193.1' if Node server is not on the same machine as MySQL
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

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER || 'rithikve90250@gmail.com', // Use environment variable or default
        pass: process.env.EMAIL_PASS || 'ubhnemasnrfjfijp', // Use environment variable or default App Password
    },
});

const RECIPIENT_EMAIL = process.env.REPORT_RECIPIENT || 'anishbtechaiads@gmail.com'; // Use environment variable or default

// --- Middleware ---
// Serve static files (HTML, CSS, JS, images) from the project directory
app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '10mb' })); // Added to parse JSON request bodies, increased limit for PDF data URI

// Add fallback for missing images
app.use((req, res, next) => {
    if (req.path.match(/\.(jpg|jpeg|png|gif)$/i)) {
        console.log(`Image requested but not found: ${req.path}`);
        // Send a placeholder image instead of 404
        res.sendFile(path.join(__dirname, 'placeholder.png'));
    } else {
        next();
    }
});

// --- API Endpoints ---

// Endpoint to get screw data
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

// Endpoint: Send Report with PDF
app.post('/api/send-report-with-pdf', async (req, res) => {
    const { pdfDataUri, filename, status, cycleNumber, timestamp } = req.body;

    if (!pdfDataUri || !filename || !cycleNumber || !timestamp) {
        return res.status(400).json({ success: false, error: 'Missing required report data for email.' });
    }

    const expectedMimePrefix = 'data:application/pdf;';
    const base64Marker = ';base64,';
    if (typeof pdfDataUri !== 'string' ||
        !pdfDataUri.startsWith(expectedMimePrefix) ||
        pdfDataUri.indexOf(base64Marker) === -1) {
        console.error('Invalid PDF data format received:', pdfDataUri.substring(0, 100)); // Log prefix
        return res.status(400).json({ success: false, error: 'Invalid PDF data format.' });
    }

    const base64Content = pdfDataUri.split(base64Marker)[1];
    const buffer = Buffer.from(base64Content, 'base64');

    const subject = `Screw Measurement Report: Cycle ${cycleNumber} - Status: ${status}`;
    const emailBody = `
        <h2>Screw Measurement Report</h2>
        <p><strong>Cycle Number:</strong> ${cycleNumber}</p>
        <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
        <p><strong>Overall Status:</strong> ${status}</p>
        <p>Please find the detailed PDF report attached.</p>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Nokia Screw Monitor" <${process.env.EMAIL_USER || 'rithikve90250@gmail.com'}>`, // Use configured user
            to: RECIPIENT_EMAIL,
            subject: subject,
            html: emailBody,
            attachments: [{
                filename: filename,
                content: buffer,
                contentType: 'application/pdf'
            }]
        });
        console.log('PDF report email sent:', info.messageId);
        res.json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending PDF email:', error);
        res.status(500).json({ success: false, error: 'Failed to send PDF report.' });
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