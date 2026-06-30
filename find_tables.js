require('dotenv').config();
const pool = require('./config/db');
async function run() {
  const [rows] = await pool.query('SHOW TABLES');
  console.log(rows.map(r => Object.values(r)[0]).filter(t => t.includes('template') || t.includes('project')));
  process.exit(0);
}
run();
