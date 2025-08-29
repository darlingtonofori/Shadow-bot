const { Client, LocalAuth } = require('whatsapp-web.js');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ==================== DATABASE SETUP ====================
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Create a table for linking codes
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS linking_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('Database ready.');
});

// ==================== TELEGRAM BOT SETUP ====================
const telegramToken = process.env.TELEGRAM_BOT_TOKEN; // You will set this in Render
const telegramBot = new TelegramBot(telegramToken, { polling: true });

// Listen for /start command on Telegram
telegramBot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `
🤖 *Welcome to Shadow Bot Manager*

To link your WhatsApp account, please send your phone number in *international format*.

Example: \\+1234567890
  `;
  telegramBot.sendMessage(chatId, welcomeText, { parse_mode: 'MarkdownV2' });
});

// Listen for phone numbers sent by users
telegramBot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Simple regex to match international phone numbers
  if (text.match(/^\+\d{10,14}$/)) {
    const phoneNumber = text;
    const linkingCode = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit code

    // Save the code to the database
    db.run(
      `INSERT OR REPLACE INTO linking_codes (phone_number, code) VALUES (?, ?)`,
      [phoneNumber, linkingCode],
      function(err) {
        if (err) {
          return telegramBot.sendMessage(chatId, 'Error. Please try again.');
        }
        // Send instructions to the user
        const instructions = `
✅ *Linking Code Generated*

Your code is: *${linkingCode}*

*To link your account:*
1. Open *WhatsApp* on your phone
2. Go to *Settings → Linked Devices → Link a Device*
3. Choose *"Link with phone number"*
4. Enter your phone number: *${phoneNumber}*
5. Enter the code above

Your account will then be linked\\!
        `;
        telegramBot.sendMessage(chatId, instructions, { parse_mode: 'MarkdownV2' });
      }
    );
  } else if (!text.startsWith('/')) {
    telegramBot.sendMessage(chatId, 'Please send a valid phone number in international format (e.g., \\+1234567890)\\.', { parse_mode: 'MarkdownV2' });
  }
});

// ==================== WHATSAPP BOT SETUP ====================
// (This part remains the same as before for handling WhatsApp commands)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('WhatsApp QR code received. This is for the main bot account.');
    // We'll handle this differently now. Maybe for an admin account.
});

client.on('ready', () => {
    console.log('✅ Main WhatsApp Bot is online and ready!');
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

client.initialize();
