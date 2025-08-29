const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express'); // Import Express for the admin page

const app = express();
const port = process.env.PORT || 3000;

// Store the QR code and status for the admin page
let qrCodeData = null;
let botStatus = 'Not ready yet. Scan the QR code.';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// WhatsApp QR Code and Ready Events
client.on('qr', (qr) => {
    qrCodeData = qr; // Save the QR code data
    botStatus = 'Scan the QR code below to link your account.';
    console.log('QR code received. Visit /admin to see it.');
    qrcode.generate(qr, { small: true }); // Optional: still show in logs but it's now private
});

client.on('ready', () => {
    botStatus = '✅ Shadow Bot is online and ready!';
    console.log(botStatus);
});

// Simple authentication for the admin page (Basic Auth)
// Set these values in Render's environment variables
const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'password';

// Middleware to check login
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
    console.log(`Admin panel available at: http://localhost:${port}/admin`);
});

// --- WhatsApp Bot Commands Logic ---

let autoReplyOn = false;

client.on('message', async (msg) => {
    const text = msg.body;
    const sender = msg.from;

    if (text === '.menu') {
        msg.reply(`*Shadow Bot Commands:*\n\n.menu - Show this menu\n.ping - Check if I'm alive\n.autoreply on/off - Toggle auto-reply\n.typosimu - Simulate typing`);
    }

    if (text === '.ping') {
        msg.reply('Pong! 🏓');
    }

    if (text === '.autoreply on') {
        autoReplyOn = true;
        msg.reply('Auto-reply turned ON ✅');
    }
    if (text === '.autoreply off') {
        autoReplyOn = false;
        msg.reply('Auto-reply turned OFF ❌');
    }

    if (text === '.typosimu') {
        await msg.chat.sendStateTyping();
        setTimeout(async () => {
            await msg.chat.clearState();
            msg.reply('Finished typing simulation.');
        }, 5000);
    }

    if (autoReplyOn && !text.startsWith('.') && sender !== 'status@broadcast') {
        msg.reply("My senpai ain't available at this moment.");
    }
});

client.initialize();
