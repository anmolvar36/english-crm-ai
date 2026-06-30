require('dotenv').config();
const pool = require('./config/db');

async function run() {
  try {
    // Insert auto_assign_projects
    await pool.query(`
      INSERT IGNORE INTO system_settings (company_id, setting_key, setting_value)
      SELECT id, 'auto_assign_projects', 'true' FROM companies
    `);
    
    // Insert ai_data_enrichment
    await pool.query(`
      INSERT IGNORE INTO system_settings (company_id, setting_key, setting_value)
      SELECT id, 'ai_data_enrichment', 'false' FROM companies
    `);

    console.log('Successfully inserted system settings for automation');
    process.exit(0);
  } catch (err) {
    console.error('Error inserting settings:', err);
    process.exit(1);
  }
}
run();
