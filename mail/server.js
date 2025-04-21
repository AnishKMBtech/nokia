// server.js
const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based version
const path = require('path');
const nodemailer = require('nodemailer'); // <-- Add nodemailer
const cors = require('cors'); // <-- Add cors

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

// --- Email Configuration ---
// IMPORTANT: Replace with your actual Gmail App Password and recipient
// Mirroring config from src/config.js for backend use
const EMAIL_USER = 'rithikve90250@gmail.com'; // The email address you send from
const EMAIL_PASS = 'ubhnemasnrfjfijp'; // The App Password generated for Nodemailer
const RECIPIENT_EMAIL = 'anishbtechaiads@gmail.com'; // The email address to send reports to

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

// --- Nodemailer Transporter ---
let transporter;
try {
    if (!EMAIL_USER || !EMAIL_PASS || !RECIPIENT_EMAIL || EMAIL_USER === 'your_email@gmail.com') {
        console.warn('Email configuration missing or using placeholders in server.js. Email sending will be disabled.');
        transporter = null; // Disable transporter if config is missing/default
    } else {
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });
        console.log('Nodemailer transporter created successfully.');
    }
} catch (error) {
    console.error('Error creating Nodemailer transporter:', error);
    transporter = null; // Disable on error
}

// --- Middleware ---
// Serve static files (HTML, CSS, JS, images) from the project directory
app.use(cors()); // <-- Enable CORS for all origins (adjust for production)
app.use(express.json({ limit: '10mb' })); // <-- Parse JSON bodies (increase limit for PDF data)
app.use(express.static(path.join(__dirname)));

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
        res.status(100).json({ error: 'Failed to retrieve screw data from database.' });
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
            console.log('Released connection back to pool.');
        }
    }
});

// --- NEW: Endpoint to receive report data and send email ---
app.post('/api/send-report', async (req, res) => {
    console.log('Received request for /api/send-report');
    const { pdfDataUri, filename, status, cycleNumber, timestamp } = req.body;

    if (!transporter) {
        console.error('Email sending is disabled due to missing configuration or transporter error.');
        return res.status(500).json({ success: false, error: 'Email sending is not configured on the server.' });
    }

    if (!pdfDataUri || !filename || !status || cycleNumber === undefined || !timestamp) {
        console.error('Missing data in /api/send-report request body:', req.body);
        return res.status(400).json({ success: false, error: 'Missing required data for sending report.' });
    }

    try {
        const base64Marker = ';base64,';
        if (pdfDataUri.indexOf(base64Marker) === -1) {
            throw new Error("Invalid PDF data URI format received by server.");
        }
        const base64Content = pdfDataUri.split(base64Marker)[1];
        const pdfBuffer = Buffer.from(base64Content, 'base64');

        const emailBody = `
            <h2>📄 Screw Measurement Report</h2>
            <p><strong>Cycle:</strong> ${cycleNumber}</p>
            <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="font-weight: bold; color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></p>
            <p>Attached is the PDF report for the completed cycle.</p>
        `;

        const mailOptions = {
            from: `"Screw Monitor" <${EMAIL_USER}>`,
            to: RECIPIENT_EMAIL,
            subject: `Report: Cycle ${cycleNumber} - ${status}`,
            html: emailBody,
            attachments: [
                {
                    filename: filename,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        };

        console.log(`Attempting to send report email via server for cycle ${cycleNumber} to ${RECIPIENT_EMAIL}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Server sent report email successfully for cycle ${cycleNumber}. Message ID: ${info.messageId}`);
        res.json({ success: true, messageId: info.messageId });

    } catch (error) {
        console.error(`Server failed to send report email for cycle ${cycleNumber}:`, error);
        res.status(500).json({ success: false, error: 'Server failed to send email.' });
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
    if (!transporter) {
        console.warn('Reminder: Email sending is currently disabled. Check EMAIL_USER/EMAIL_PASS/RECIPIENT_EMAIL in server.js.');
    }
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