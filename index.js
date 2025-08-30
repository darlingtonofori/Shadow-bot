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

// Admin route to show QR code and status - THEMED VERSION
app.get('/admin', requireAuth, (req, res) => {
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NGX5 Admin Panel</title>
        <style>
            body {
                background-color: #0f0f0f;
                color: #e0e0e0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                line-height: 1.6;
            }
            .container {
                max-width: 900px;
                margin: 0 auto;
                background-color: #1a1a1a;
                border-radius: 12px;
                padding: 25px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                border: 1px solid #2d2d2d;
            }
            h1 {
                color: #8a2be2; /* Purple */
                text-align: center;
                margin-bottom: 10px;
                font-size: 2.2em;
                text-shadow: 0 0 8px rgba(138, 43, 226, 0.4);
            }
            .status {
                background-color: #2d2d2d;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #4169e1; /* Royal Blue */
            }
            .status strong {
                color: #4169e1;
            }
            .qr-container {
                text-align: center;
                background-color: #2d2d2d;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            pre {
                display: inline-block;
                background-color: #0f0f0f;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #4169e1;
            }
            .instructions {
                background-color: #2d2d2d;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                font-size: 0.9em;
                border-left: 4px solid #8a2be2; /* Purple */
            }
            .footer {
                text-align: center;
                margin-top: 25px;
                font-size: 0.8em;
                color: #888;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>NGX5 Admin Panel</h1>
            
            <div class="status">
                <strong>Status:</strong> ${botStatus}
            </div>
    `;
    
    if (qrCodeData) {
        html += `
            <div class="qr-container">
                <p>Scan this QR code with <strong>YOUR PHONE</strong> to link NGX5 to your account:</p>
        `;
        // Generate the QR code as text for the web
        qrcode.generate(qrCodeData, { small: true }, (qrcodeText) => {
            html += `<pre>${qrcodeText}</pre>`;
            html += `
                </div>
                <div class="instructions">
                    <strong>Instructions:</strong><br>
                    1. Open WhatsApp on your phone<br>
                    2. Tap <strong>Settings → Linked Devices → Link a Device</strong><br>
                    3. Scan the QR code shown above
                </div>
            `;
            // Close the container and HTML
            html += `
                <div class="footer">
                    NGX5 WhatsApp Automation System | Secure Admin Panel
                </div>
            </div>
        </body>
        </html>
            `;
            res.send(html);
        });
    } else {
        html += `
            <p>No QR code generated yet. Please wait a moment and refresh the page.</p>
            <div class="footer">
                NGX5 WhatsApp Automation System | Secure Admin Panel
            </div>
        </div>
    </body>
    </html>
        `;
        res.send(html);
    }
});
    
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
