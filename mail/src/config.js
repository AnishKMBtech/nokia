// src/config.js
export const totalScrews = 19; // Total screws in one complete cycle
export const processingDelay = 750; // ms to show yellow marker
export const stepDelay = 1500; // ms between starting each screw processing
export const POLLING_DELAY = 500; // 0.5 seconds between polls

// Marker positions (updated based on the provided image layout)
export const markerPositions = [
    { id: 1, left: '47.2%', top: '64%' },
    { id: 2, left: '45.0%', top: '69.5%' },
    { id: 3, left: '38.0%', top: '66.5%' },
    { id: 4, left: '39.0%', top: '48.8%' },
    { id: 5, left: '49.0%', top: '48.8%' },
    { id: 6, left: '65.0%', top: '48.8%' },
    { id: 7, left: '82.0%', top: '49.8%' },
    { id: 8, left: '81.8%', top: '57.8%' },
    { id: 9, left: '81.8%', top: '65.8%' },
    { id: 10, left: '75.0%', top: '71.0%' },
    { id: 11, left: '65%', top: '71.0%' },
    { id: 12, left: '56.0%', top: '69.0%' },
    { id: 13, left: '24.7%', top: '67.8%' },
    { id: 14, left: '18.3%', top: '68.8%' },
    { id: 15, left: '20.0%', top: '48.8%' },
    { id: 16, left: '16.0%', top: '10.0%' },
    { id: 17, left: '30.0%', top: '10.0%' },
    { id: 18, left: '43%', top: '10.0%' }, // Adjusted left and top position again for screw 18
    { id: 19, left: '61.0%', top: '12.5%' },
];

// --- Email Configuration ---
// Replace with your actual Gmail App Password and recipient
export const EMAIL_USER = 'your_email@gmail.com'; // The email address you send from
export const EMAIL_PASS = 'your_gmail_app_password'; // The App Password generated for Nodemailer
export const RECIPIENT_EMAIL = 'recipient_email@example.com'; // The email address to send reports to
