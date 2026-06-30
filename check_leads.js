require('dotenv').config();
const pool = require('./config/db');
async function test() {
  try {
    const [rows] = await pool.query('SELECT * FROM leads WHERE source="AI Chatbot"');
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
