const express = require('express');
const { Client } = require('whatsapp-web.js');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-pairing-client"
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// API endpoint to generate pairing code
app.post('/generate-pairing-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }
        
        // Generate pairing code using WhatsApp Web.js
        const pairingCode = await client.requestPairingCode(phoneNumber);
        
        res.json({ 
            success: true, 
            code: pairingCode 
        });
    } catch (error) {
        console.error('Error generating pairing code:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to generate pairing code' 
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server after WhatsApp client is ready
client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});

// Initialize WhatsApp client
client.initialize();
