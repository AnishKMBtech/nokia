// src/mailer.js
import { EMAIL_USER, EMAIL_PASS, RECIPIENT_EMAIL } from './config.js'; // Import credentials from config

// Lazy load nodemailer to avoid errors if not installed or in environments where it's not needed immediately
let nodemailer;
async function getNodemailer() {
    if (!nodemailer) {
        // Use dynamic import for potential CommonJS/ESM compatibility issues
        const module = await import('nodemailer');
        nodemailer = module.default || module; // Handle default export
    }
    return nodemailer;
}

let transporter;
async function getTransporter() {
    if (!transporter) {
        const mailer = await getNodemailer();
        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error("Email credentials (EMAIL_USER, EMAIL_PASS) are not configured in config.js. Cannot create transporter.");
            throw new Error("Email credentials not configured.");
        }
        transporter = mailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });
        console.log("Nodemailer transporter created.");
    }
    return transporter;
}

/**
 * Sends the report PDF via email.
 * @param {string} pdfDataUri - The PDF content as a base64 data URI.
 * @param {string} filename - The desired filename for the PDF attachment.
 * @param {string} status - The overall status of the cycle ('PASS' or 'FAIL').
 * @param {number} cycleNumber - The cycle number.
 * @param {Date} timestamp - The timestamp when the report was generated.
 */
export async function sendReportEmail(pdfDataUri, filename, status, cycleNumber, timestamp) {
    if (!RECIPIENT_EMAIL) {
        console.error("Recipient email (RECIPIENT_EMAIL) is not configured in config.js. Cannot send email.");
        return; // Don't throw, just log and exit
    }

    if (!pdfDataUri || !filename) {
        console.error('Missing PDF data URI or filename for email.');
        return;
    }

    try {
        const mailTransporter = await getTransporter();

        const base64Marker = ';base64,';
        if (pdfDataUri.indexOf(base64Marker) === -1) {
            throw new Error("Invalid PDF data URI format.");
        }
        const base64Content = pdfDataUri.split(base64Marker)[1];
        const pdfBuffer = Buffer.from(base64Content, 'base64');

        const emailBody = `
            <h2>📄 Screw Measurement Report</h2>
            <p><strong>Cycle:</strong> ${cycleNumber}</p>
            <p><strong>Timestamp:</strong> ${timestamp.toLocaleString()}</p>
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

        console.log(`Attempting to send report email for cycle ${cycleNumber} to ${RECIPIENT_EMAIL}...`);
        const info = await mailTransporter.sendMail(mailOptions);
        console.log(`Report email sent successfully for cycle ${cycleNumber}. Message ID: ${info.messageId}`);

    } catch (error) {
        console.error(`Failed to send report email for cycle ${cycleNumber}:`, error);
        // Optionally, display an alert or update UI to indicate email failure
        // alert(`Failed to send report email for cycle ${cycleNumber}. Check console.`);
    }
}

// Optional: Add a function to send failure alerts if needed, similar to the reference
// export async function sendFailureAlert(reportData, cycleNumber, timestamp) { ... }
