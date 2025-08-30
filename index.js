const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express'); // Import Express to create a web server
const app = express();
const port = process.env.PORT || 3000;

// Store the QR code and status for the admin page
let qrCodeData = null;
let botStatus = 'NGX5 is getting ready...';

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "NGX5-User" })
});

// Simple authentication for the admin page
// Set these in Render's environment variables
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

// Admin route to show QR code and status
app.get('/admin', requireAuth, (req, res) => {
    let html = `
        <h1>NGX5 Admin Panel</h1>
        <p><strong>Status:</strong> ${botStatus}</p>
    `;
    
    if (qrCodeData) {
        html += `<p>Scan this QR code with YOUR PHONE to link NGX5 to your account:</p>`;
        // Generate the QR code as text for the web
        qrcode.generate(qrCodeData, { small: true }, (qrcodeText) => {
            html += `<pre>${qrcodeText}</pre>`;
            res.send(html);
        });
    } else {
        html += `<p>No QR code generated yet. Wait a moment and refresh.</p>`;
        res.send(html);
    }
});

// Start the Express server to serve the admin page
app.listen(port, () => {
    console.log(`NGX5 Admin panel is ready at: http://localhost:${port}/admin`);
});

// WhatsApp Client Events
client.on('qr', (qr) => {
    qrCodeData = qr; // Store the QR code data for the admin panel
    botStatus = 'Scan the QR code in the admin panel to link your account.';
    console.log('QR code received. Visit /admin to see it.'); // Log message, not the QR code itself
});

client.on('ready', () => {
    botStatus = '✅ NGX5 is online and connected to your account!';
    console.log(botStatus);
});

client.on('message_create', async (msg) => {
    const text = msg.body;
    const chat = await msg.getChat();

    if (msg.fromMe && text.startsWith('.')) {
        const command = text.split(' ')[0].toLowerCase();

        switch(command) {
            case '.arise':
                const menuText = `
🛠 *NGX5 Bot Menu* 🛠

*.ping* - Check if I'm online
*.typesimu* - Simulate typing for 15s
*.reclaim* - Simulate recording for 15s
*.bluetick* - Auto-read messages (seen)
*.broadcast* - Broadcast a message
*.vv* - Save a view-once message
*.autoreply* - Toggle auto-reply
*.autoreply_set [message]* - Set auto-reply text
*.search [query]* - Google search

*Current Auto-Reply:* "MY SENPIA AIN'T AVAILABLE!"
                `;
                chat.sendMessage(menuText);
                break;

            case '.ping':
                chat.sendMessage('Pong! 🏓');
                break;

            case '.bluetick':
                chat.sendMessage("Bluetick feature enabled for this chat.");
                break;
                
            case '.autoreply':
                chat.sendMessage('Auto-reply is: ON ✅\nMessage: "MY SENPIA AIN\'T AVAILABLE!"');
                break;

            // Add other commands here
        }
    }
});

client.initialize();
