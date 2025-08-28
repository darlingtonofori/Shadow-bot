const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./db.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// WhatsApp Client Setup
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Generate a random token
function generateToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// --- Admin Panel Setup (Simple Express Server) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple admin route to generate a token (You will visit this URL)
app.get('/generate-token', (req, res) => {
  const phoneNumber = req.query.phone_number; // Get phone number from query parameter
  if (!phoneNumber) {
    return res.send("Error: Please provide a phone_number parameter (e.g., /generate-token?phone_number=+1234567890)");
  }

  const token = generateToken();

  // Save token to database
  db.run(`INSERT INTO auth_tokens (token, phone_number) VALUES (?, ?)`, [token, phoneNumber], function(err) {
    if (err) {
      return res.send("Error: Could not generate token. Maybe the number already has one?");
    }
    res.send(`Token for ${phoneNumber}: ${token}`);
  });
});

app.listen(port, () => {
  console.log(`Admin panel running on port ${port}. Visit /generate-token?phone_number=+1234567890`);
});

// --- WhatsApp Bot Logic ---
client.on('qr', (qr) => {
  console.log('SCAN THIS QR CODE WITH YOUR PHONE TO SET UP THE BOT MASTER SESSION:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('BOT MASTER SESSION AUTHENTICATED!');
});

client.on('ready', () => {
  console.log('Shadow Bot is ready!');
});

// Listen for messages
client.on('message', async (msg) => {
  const sender = msg.from;
  const messageBody = msg.body;

  // Check if the message is an auth command
  if (messageBody.startsWith('.auth ')) {
    const userToken = messageBody.split(' ')[1]; // Get the token from the message

    // Check if the token is valid and unused
    db.get(`SELECT * FROM auth_tokens WHERE token = ? AND used = 0`, [userToken], async (err, row) => {
      if (err) {
        return console.error(err);
      }
      if (row) {
        // Token is valid!
        // 1. Mark the token as used
        db.run(`UPDATE auth_tokens SET used = 1 WHERE token = ?`, [userToken]);
        // 2. Add user to linked users
        db.run(`INSERT OR IGNORE INTO linked_users (phone_number) VALUES (?)`, [sender]);
        
        // Send success message
        await msg.reply('✅ *Authentication Successful!* Your account is now linked. Use *.menu* to see commands.');
        console.log(`User ${sender} linked successfully.`);

      } else {
        // Token is invalid
        await msg.reply('❌ *Invalid or expired token.* Please contact the admin for a new one.');
      }
    });
  }

  // Check if user is linked before processing other commands
  db.get(`SELECT * FROM linked_users WHERE phone_number = ?`, [sender], (err, row) => {
    if (err) return console.error(err);
    
    if (row) {
      // User is linked, process commands like .menu, .ping etc.
      if (messageBody === '.menu') {
        msg.reply(`Welcome to Shadow Bot! Your linked commands are active.`);
      }
      if (messageBody === '.ping') {
        msg.reply('Pong! 🏓');
      }
    } else {
      // User is NOT linked. Only allow .auth command.
      if (!messageBody.startsWith('.auth ')) {
        msg.reply('⚠️ Please link your account first. Contact the admin for an authentication token and then send *.auth YOUR_TOKEN*');
      }
    }
  });
});

client.initialize();
