const express = require('express');
const { Client } = require('whatsapp-web.js');
const app = express();
const port = process.env.PORT || 3000;

// Initialize WhatsApp client
const client = new Client({
    // Add your configuration here
});

// API endpoint to generate pairing code
app.post('/generate-pairing-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
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

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
