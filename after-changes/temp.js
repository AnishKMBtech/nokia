const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3332;
const dataFilePath = path.join(__dirname, 'data.json');

// Add CORS middleware to allow cross-origin requests
app.use((req, res, next) => {
    // Allow requests from your main application origin
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    // Allow specified methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // Allow specified headers
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Allow credentials (if needed)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

app.use(bodyParser.json());

// Helper: Read data from file
function readData() {
    if (!fs.existsSync(dataFilePath)) {
        // Create sample data if file doesn't exist
        const sampleData = [
            {
                "id": 1,
                "station_id": "ST-101",
                "palette_id": "PL-001", 
                "chassis_id": "CH-789",
                "received_at": new Date().toISOString()
            }
        ];
        writeData(sampleData);
        return sampleData;
    }
    
    try {
        const rawData = fs.readFileSync(dataFilePath);
        return JSON.parse(rawData || '[]');
    } catch (error) {
        console.error('Error reading data file:', error);
        return [];
    }
}

// Helper: Write data to file
function writeData(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

// POST: Save incoming data
app.post('/api/station', (req, res) => {
    const { station_id, palette_id, chassis_id } = req.body;

    if (!station_id || !palette_id || !chassis_id) {
        return res.status(400).json({ error: 'Missing station_id, palette_id or chassis_id' });
    }

    const records = readData();
    const newRecord = {
        id: records.length + 1,
        station_id,
        palette_id,
        chassis_id,
        received_at: new Date().toISOString()
    };

    records.push(newRecord);
    writeData(records);

    console.log('✅ New record saved to data.json:', newRecord);
    res.status(201).json({ message: 'Data stored in data.json', data: newRecord });
});

// GET: Return all stored data
app.get('/api/station', (req, res) => {
    const records = readData();
    res.json(records);
});

// DELETE: Clear all data
app.delete('/api/station', (req, res) => {
    writeData([]);
    console.log('🗑️ All data cleared from data.json');
    res.json({ message: 'All station data cleared.' });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📝 CORS enabled for origin: http://localhost:3000`);
    
    // Create sample data if it doesn't exist
    if (!fs.existsSync(dataFilePath)) {
        readData(); // This will create the sample data
        console.log('📄 Sample data created in data.json');
    }
});
