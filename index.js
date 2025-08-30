const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const port = process.env.PORT || 3000;

// Store the QR code and status for the admin page
let qrCodeData = null;
let botStatus = 'NGX5 is getting ready...';
let isBotReady = false;

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "NGX5-User" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

// Simple authentication for the admin page
const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'password';

// Middleware to check login
const requireAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="NGX5 Admin Panel"');
        return res.status(401).send('Authentication required.');
    }

    const [username, password] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="NGX5 Admin Panel"');
        return res.status(401).send('Invalid credentials.');
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        botReady: isBotReady,
        timestamp: new Date().toISOString(),
        qrCode: qrCodeData ? 'available' : 'not needed'
    });
});

// Admin route to show QR code and status
app.get('/admin', requireAuth, async (req, res) => {
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NGX5 Admin Panel</title>
        <style>
            body { background-color: #0f0f0f; color: #e0e0e0; font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 900px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; padding: 25px; }
            h1 { color: #8a2be2; text-align: center; margin-bottom: 10px; }
            .status { background-color: #2d2d2d; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4169e1; }
            .qr-container { text-align: center; background-color: #2d2d2d; padding: 20px; border-radius: 8px; margin: 20px 0; }
            #qrcode { display: inline-block; background-color: white; padding: 15px; border-radius: 8px; }
            .instructions { background-color: #2d2d2d; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 25px; color: #888; }
            .refresh-btn { background-color: #4169e1; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>NGX5 Admin Panel</h1>
            <div class="status">
                <strong>Status:</strong> ${botStatus}<br>
                <strong>Bot Ready:</strong> ${isBotReady ? '✅ Yes' : '❌ No'}
            </div>
    `;
    
    if (qrCodeData) {
        try {
            const qrCodeImage = await QRCode.toDataURL(qrCodeData);
            html += `
                <div class="qr-container">
                    <p>Scan this QR code with YOUR PHONE:</p>
                    <img src="${qrCodeImage}" id="qrcode" alt="WhatsApp QR Code">
                    <br>
                    <button class="refresh-btn" onclick="location.reload()">Refresh</button>
                </div>
            `;
        } catch (err) {
            html += `<div class="qr-container"><p>Error generating QR code</p></div>`;
        }
    } else {
        html += `<div class="qr-container"><p>No QR code needed - already connected</p></div>`;
    }
    
    html += `
            <div class="instructions">
                <strong>Testing Instructions:</strong><br>
                1. Open WhatsApp on your phone<br>
                2. Send <code>.ping</code> in any chat<br>
                3. Bot should reply with "Pong! 🏓"<br>
                4. Check Render logs for debugging info
            </div>
            <div class="footer">NGX5 WhatsApp Automation System</div>
        </div>
    </body>
    </html>`;
    
    res.send(html);
});

// Start the Express server
app.listen(port, () => {
    console.log(`NGX5 Admin panel ready at: http://localhost:${port}/admin`);
});

// WhatsApp Client Events
client.on('qr', (qr) => {
    qrCodeData = qr;
    botStatus = 'Scan QR code to link your account';
    isBotReady = false;
    console.log('QR code received. Visit /admin to see it.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    qrCodeData = null;
    botStatus = '✅ NGX5 is online and connected!';
    isBotReady = true;
    console.log('✅ NGX5 is ready!');
    console.log('Test by sending ".ping" in any WhatsApp chat');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    botStatus = '❌ Authentication failed - rescan QR code';
});

client.on('disconnected', (reason) => {
    console.log('❌ Client was logged out:', reason);
    botStatus = '❌ Disconnected - rescan QR code';
    isBotReady = false;
});

// SIMPLIFIED MESSAGE HANDLING WITH DEBUGGING
client.on('message', async (msg) => {
    console.log('📩 Received message:', {
        from: msg.from,
        fromMe: msg.fromMe,
        body: msg.body,
        type: msg.type,
        timestamp: new Date().toISOString()
    });

    // Only respond to text messages from yourself that start with a dot
    if (msg.fromMe && msg.body && msg.body.startsWith('.')) {
        const command = msg.body.toLowerCase().trim();
        console.log('🔍 Detected command:', command);

        try {
            // Get the chat to send response
            const chat = await msg.getChat();
            
            if (command === '.ping') {
                console.log('🚀 Sending pong response');
                await chat.sendMessage('Pong! 🏓');
                console.log('✅ Pong sent successfully');
            }
            else if (command === '.arise') {
                const menuText = `🛠 *NGX5 Bot Menu* 🛠

*.ping* - Check if I'm online
*.autoreply* - Toggle auto-reply

*Status:* ✅ Connected and working!`;
                await chat.sendMessage(menuText);
                console.log('✅ Menu sent successfully');
            }
            else if (command === '.autoreply') {
                await chat.sendMessage('Auto-reply is: ON ✅\nMessage: "MY SENPAI AIN\'T AVAILABLE!"');
                console.log('✅ Autoreply message sent');
            }
            else {
                await chat.sendMessage(`Unknown command: ${command}\nUse .arise for menu`);
                console.log('❌ Unknown command handled');
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
        }
    }
});

// Add this event to check if messages are being sent
client.on('message_create', (msg) => {
    console.log('📤 Message created (sent by you):', {
        body: msg.body,
        fromMe: msg.fromMe,
        timestamp: new Date().toISOString()
    });
});

// Initialize the client
console.log('Initializing WhatsApp client...');
client.initialize();
