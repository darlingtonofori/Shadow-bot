const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db.js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// WhatsApp Client Setup
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Generate random token
function generateToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Admin panel route to generate token
app.get('/generate-token', (req, res) => {
  const phoneNumber = req.query.phone_number;
  if (!phoneNumber) {
    return res.send("Error: Add ?phone_number=+1234567890 to the URL");
  }

  const token = generateToken();

  db.run(
    `INSERT INTO auth_tokens (token, phone_number) VALUES (?, ?)`,
    [token, phoneNumber],
    function(err) {
      if (err) {
        return res.send("Error: Number might already have a token.");
      }
      res.send(`Token for ${phoneNumber}: ${token}`);
    }
  );
});

// Start the Express server
app.listen(port, () => {
  console.log(`Admin panel: http://localhost:${port}/generate-token`);
});

// WhatsApp event handlers
client.on('qr', (qr) => {
  console.log('Scan this QR code:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('Logged in successfully!');
});

client.on('ready', () => {
  console.log('Shadow Bot is ready!');
});

// Handle incoming messages
client.on('message', async (msg) => {
  const text = msg.body;
  const sender = msg.from;

  // Check if user is linked
  db.get(`SELECT * FROM linked_users WHERE phone_number = ?`, [sender], (err, row) => {
    if (err) return console.error(err);

    if (row) {
      // User is linked - process commands
      if (text === '.menu') {
        msg.reply(`🛠 *Shadow Bot* 🛠
        
• .ping - Check latency
• .autoreply - Set auto-response
• .bluetick - Mark messages as read
• .typosimu - Simulate typing
• .savestat - Save status updates
• .vv - Save view-once media
• .broadcast - Broadcast message`);
      } else if (text === '.ping') {
        msg.reply('Pong! 🏓');
      } else if (text.startsWith('.autoreply')) {
        msg.reply('Auto-reply activated!');
        // Add your auto-reply logic here
      }
      // Add other commands here
    } else {
      // User not linked - check for auth command
      if (text.startsWith('.auth ')) {
        const token = text.split(' ')[1];
        db.get(`SELECT * FROM auth_tokens WHERE token = ? AND used = 0`, [token], (err, row) => {
          if (err || !row) {
            msg.reply('Invalid token. Contact admin.');
          } else {
            // Mark token as used and add user to linked list
            db.run(`UPDATE auth_tokens SET used = 1 WHERE token = ?`, [token]);
            db.run(`INSERT INTO linked_users (phone_number) VALUES (?)`, [sender]);
            msg.reply('✅ Account linked! Use .menu to see commands.');
          }
        });
      } else {
        msg.reply('Please authenticate first. Contact admin for token.');
      }
    }
  });
});

client.initialize();
