require('dotenv').config();
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

// Copy triggerAutoConversion from leadController.js exactly
const triggerAutoConversion = async (id, companyId) => {
  try {
    const [settings] = await pool.execute(
      `SELECT setting_value FROM system_settings WHERE company_id = ? AND setting_key = 'auto_convert_lead'`,
      [companyId]
    );
    const autoConvert = settings.length > 0 && settings[0].setting_value === 'true';

    if (!autoConvert) return { success: false, reason: 'auto_convert_lead setting is false or missing' };

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get lead to verify existence
      const [leads] = await connection.execute(
        `SELECT * FROM leads WHERE id = ? AND company_id = ? AND is_deleted = 0`,
        [id, companyId]
      );

      if (leads.length === 0) {
        await connection.rollback();
        connection.release();
        return { success: false, reason: 'Lead not found' };
      }

      const lead = leads[0];
      const targetCompanyName = lead.company_name || lead.person_name || 'Auto Client';
      const targetEmail = lead.email || `client-${id}@example.com`;
      const targetPassword = 'Welcome@Client123';

      // Check if user already exists
      const [existingUsers] = await connection.execute(
        `SELECT id FROM users WHERE email = ? AND company_id = ?`,
        [targetEmail, companyId]
      );

      let ownerId;

      if (existingUsers.length > 0) {
        ownerId = existingUsers[0].id;
      } else {
        const hashedPassword = await bcrypt.hash(targetPassword, 10);
        const [userResult] = await connection.execute(
          `INSERT INTO users (company_id, name, email, password, role, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            companyId,
            targetCompanyName,
            targetEmail,
            hashedPassword,
            'CLIENT',
            'Active'
          ]
        );
        ownerId = userResult.insertId;
      }

      // Create client
      const [clientResult] = await connection.execute(
        `INSERT INTO clients (
          company_id, company_name, owner_id, address, city, state, zip, country,
          phone_country_code, phone_number, website, vat_number, gst_number,
          currency, currency_symbol, disable_online_payment, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          targetCompanyName,
          ownerId,
          lead.address || null,
          lead.city || null,
          lead.state || null,
          lead.zip || null,
          lead.country || 'United States',
          '+1',
          lead.phone || null,
          null,
          null,
          null,
          'USD',
          '$',
          0,
          'Active'
        ]
      );

      const clientId = clientResult.insertId;

      // Create primary contact
      const contactName = lead.person_name || targetCompanyName || 'Contact';
      const contactPhone = lead.phone || null;

      if (contactName) {
        await connection.execute(
          `INSERT INTO client_contacts (
            client_id, name, job_title, email, phone, is_primary
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            clientId,
            contactName,
            null,
            targetEmail,
            contactPhone,
            1
          ]
        );
      }

      // AI & Automation: Auto-Create Project and Tasks on Conversion if auto_assign_projects setting is enabled
      try {
        const [projSettings] = await connection.execute(
          `SELECT setting_value FROM system_settings WHERE company_id = ? AND setting_key = 'auto_assign_projects'`,
          [companyId]
        );
        const autoAssign = projSettings.length > 0 && projSettings[0].setting_value === 'true';

        if (autoAssign) {
          // Get the list of services for this lead
          const [services] = await connection.execute(
            `SELECT ls.item_id, i.title as service_name, i.rate as service_price 
             FROM lead_services ls
             LEFT JOIN items i ON ls.item_id = i.id
             WHERE ls.lead_id = ? AND ls.company_id = ?`,
            [id, companyId]
          );

          if (services.length > 0) {
            for (const service of services) {
              const shortCode = `PRJ-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
              const projectName = `${service.service_name} Project (${targetCompanyName})`;

              // Insert new project
              const [projResult] = await connection.execute(
                `INSERT INTO projects (
                  company_id, short_code, project_name, start_date, deadline, no_deadline,
                  client_id, budget, price, status, created_by, description
                ) VALUES (?, ?, ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 0, ?, ?, ?, 'in progress', ?, ?)`,
                [
                  companyId,
                  shortCode,
                  projectName,
                  clientId,
                  service.service_price || null,
                  service.service_price || null,
                  lead.owner_id || 1,
                  `Automatically created project for service: ${service.service_name}`
                ]
              );

              const projectId = projResult.insertId;

              // Auto-assign project member (lead owner employee)
              if (lead.owner_id) {
                await connection.execute(
                  `INSERT IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)`,
                  [projectId, lead.owner_id]
                );
              }

              // Auto-create 3 standard kickoff tasks for the project and assign them to the lead owner
              const tasksToCreate = [
                { title: `Client Onboarding & Briefing - ${service.service_name}`, priority: 'High', desc: 'Discuss brief and requirements with the client.' },
                { title: `Requirements Gathering & Scope - ${service.service_name}`, priority: 'Medium', desc: 'Define goals, assets, and milestones.' },
                { title: `Project Kickoff Call - ${service.service_name}`, priority: 'Medium', desc: 'Review kickoff checklist and start production.' }
              ];

              for (const t of tasksToCreate) {
                const taskCode = `TSK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                const [taskResult] = await connection.execute(
                  `INSERT INTO tasks (
                    company_id, code, title, description, project_id, client_id, lead_id,
                    start_date, due_date, status, priority, created_by
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 'Incomplete', ?, ?)`,
                  [
                    companyId,
                    taskCode,
                    t.title,
                    t.desc,
                    projectId,
                    clientId,
                    id,
                    t.priority,
                    lead.owner_id || 1
                  ]
                );

                const taskId = taskResult.insertId;

                // Assign task to the lead owner employee
                if (lead.owner_id) {
                  await connection.execute(
                    `INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)`,
                    [taskId, lead.owner_id]
                  );
                }
              }
            }
          }
        }
      } catch (autoProjErr) {
        console.error('Auto-Project creation failed inside helper:', autoProjErr);
        throw autoProjErr; // Throw to rollback and see details
      }

      await connection.commit();
      return { success: true };
    } catch (convErr) {
      await connection.rollback();
      return { success: false, error: convErr };
    } finally {
      connection.release();
    }
  } catch (settingsErr) {
    return { success: false, error: settingsErr };
  }
};

async function runTest() {
  // Clean up client 6 first
  await pool.query('DELETE FROM clients WHERE id = 6');
  
  const result = await triggerAutoConversion(13, 2);
  console.log('Result:', result);
  process.exit(0);
}

runTest();
