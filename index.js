const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Store the QR code and status for the admin page
let qrCodeData = null;
let botStatus = 'Getting ready... Please wait.';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// WhatsApp QR Code and Ready Events
client.on('qr', (qr) => {
    qrCodeData = qr;
    botStatus = 'Scan the QR code below to link your account.';
    console.log('QR code received. Visit /admin to see it.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    botStatus = '✅ Shadow Bot is online and ready!';
    console.log(botStatus);
});

// Simple authentication for the admin page
const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'password';

const requireAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Shadow Bot Admin"');
        return res.status(401).send('Authentication required.');
    }

    const [username, password] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Shadow Bot Admin"');
        return res.status(401).send('Invalid credentials.');
    }
};

// Admin route to show QR code and status
app.get('/admin', requireAuth, (req, res) => {
    let html = `
        <h1>Shadow Bot Admin</h1>
        <p><strong>Status:</strong> ${botStatus}</p>
    `;
    
    if (qrCodeData) {
        html += `<p>Scan this QR code with WhatsApp:</p>`;
        qrcode.generate(qrCodeData, { small: true }, (qrcodeText) => {
            html += `<pre>${qrcodeText}</pre>`;
            res.send(html);
        });
    } else {
        html += `<p>No QR code generated yet. Wait a moment and refresh.</p>`;
        res.send(html);
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`Admin panel is ready at: http://localhost:${port}/admin`);
});

// --- WhatsApp Bot Commands Logic ---

let autoReplyOn = false;

client.on('message', async (msg) => {
    const text = msg.body;
    const sender = msg.from;

    // .menu command
    if (text === '.menu') {
        msg.reply(`*🛠 Shadow Bot v1.0* \n\n*.menu* - Show commands\n*.ping* - Check online status\n*.autoreply on/off* - Toggle auto-reply`);
    }

    // .ping command
    if (text === '.ping') {
        msg.reply('Pong! 🏓');
    }

    // .autoreply command
    if (text === '.autoreply on') {
        autoReplyOn = true;
        msg.reply('Auto-reply turned ON ✅');
    }
    if (text === '.autoreply off') {
        autoReplyOn = false;
        msg.reply('Auto-reply turned OFF ❌');
    }

    // Auto-reply logic
    if (autoReplyOn && !text.startsWith('.') && sender !== 'status@broadcast') {
        msg.reply("My senpai ain't available at this moment.");
    }
});

client.initialize();
