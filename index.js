const { Client, LocalAuth } = require('whatsapp-web.js');
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ==================== DATABASE SETUP ====================
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Create tables for linking codes and linked users
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS linking_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS linked_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE NOT NULL,
    linked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('Database ready.');
});

// ==================== TELEGRAM BOT SETUP ====================
const telegramToken = process.env.TELEGRAM_BOT_TOKEN; // SET THIS IN RENDER
const telegramBot = new TelegramBot(telegramToken, { polling: true });

// Store pending token promises (simulates wait)
const pendingTokens = new Map();

// Function to generate a random 6-digit code
function generateToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. Handle /start command
telegramBot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `
*🔹 Welcome to Shadow Bot Manager (Server 1) 🔹*

*How to Link Your WhatsApp:*
1. Use the /link command followed by your phone number.
   • Example: \`/link +1234567890\`

2. You will receive a 6-digit linking token.

3. Open *WhatsApp → Linked Devices → Link a Device → Link with phone number*.

4. Enter your phone number and the token.

*Other Commands:*
/link +1234567890 - Request a linking token.
/progress - Check if your number is linked.
  `;
  telegramBot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
});

// 2. Handle /link command
telegramBot.onText(/\/link (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const phoneNumber = match[1].trim();

  // Validate phone number format
  if (!phoneNumber.match(/^\+\d{10,14}$/)) {
    return telegramBot.sendMessage(chatId, '❌ *Error:* Please provide a valid phone number in international format.\nExample: `/link +1234567890`', { parse_mode: 'Markdown' });
  }

  // Confirm request
  telegramBot.sendMessage(chatId, '✅ *Request Received.*\nYou will be sent a WhatsApp token shortly. Please wait patiently.', { parse_mode: 'Markdown' });

  // Simulate processing delay (30 seconds)
  pendingTokens.set(chatId, phoneNumber);
  setTimeout(() => {
    if (pendingTokens.has(chatId)) {
      const code = generateToken();
      
      // Save to database
      db.run(
        `INSERT OR REPLACE INTO linking_codes (phone_number, code) VALUES (?, ?)`,
        [phoneNumber, code],
        function(err) {
          if (err) {
            return telegramBot.sendMessage(chatId, '❌ Database error. Please try again.');
          }
          // Send the token to the user
          const message = `
*✅ Your Linking Token is:* \`${code}\`

*To complete linking:*
1. Open *WhatsApp* on your phone
2. Go to *Settings → Linked Devices → Link a Device*
3. Choose *"Link with phone number"*
4. Enter your phone number: *${phoneNumber}*
5. Enter this code: *${code}*

Use /progress to check your linking status.
          `;
          telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
          pendingTokens.delete(chatId);
        }
      );
    }
  }, 30000); // 30 second delay
});

// 3. Handle /progress command
telegramBot.onText(/\/progress/, (msg) => {
  const chatId = msg.chat.id;
  
  // Check if user has a pending token first
  const pendingNumber = pendingTokens.get(chatId);
  if (pendingNumber) {
    return telegramBot.sendMessage(chatId, `⏳ Your token for *${pendingNumber}* is being generated. Please wait.`, { parse_mode: 'Markdown' });
  }

  // Check database for linked status
  db.get(`SELECT * FROM linked_users WHERE phone_number = ?`, [pendingNumber], (err, row) => {
    if (err) {
      return telegramBot.sendMessage(chatId, '❌ Database error. Please try again.');
    }
    if (row) {
      telegramBot.sendMessage(chatId, `✅ *Number Linked Successfully!*\nYour number *${row.phone_number}* is now connected to Shadow Bot. You can now use commands in WhatsApp.`, { parse_mode: 'Markdown' });
    } else {
      telegramBot.sendMessage(chatId, '❌ *Not Linked Yet.*\nPlease use /link +1234567890 to get started.', { parse_mode: 'Markdown' });
    }
  });
});

// ==================== WHATSAPP BOT SETUP ====================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }
});

client.on('qr', (qr) => {
    console.log('Scan this QR code to link the main bot account:');
    // You can add QR terminal generation here if needed
});

client.on('ready', () => {
    console.log('✅ Main WhatsApp Bot is online and ready!');
});

// Handle incoming WhatsApp messages for linking
client.on('message', async (msg) => {
  // This is where you'll add logic to verify codes from WhatsApp
  // For now, well just acknowledge messages
  if (msg.body.toLowerCase() === 'hi') {
    msg.reply('Hello! Use .menu to see commands.');
  }
});

client.initialize();

// Note: You'll need to add the WhatsApp message handler to check codes against the database
