require('dotenv').config();
const pool = require('./config/db');
async function test() {
  try {
    await pool.query('UPDATE leads SET company_id = 2 WHERE source="AI Chatbot"');
    console.log('Updated');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
