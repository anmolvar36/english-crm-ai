/**
 * Create Default Admin Users
 * Run this script to create default admin users for each company
 */

const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function createDefaultUsers() {
    try {
        console.log('🔐 Creating default admin users...');

        // Default password for all admin users
        const defaultPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const users = [
            {
                company_id: 1,
                name: 'Admin User',
                email: 'admin@democompany.com',
                role: 'ADMIN'
            },
            {
                company_id: 2,
                name: 'John Doe',
                email: 'admin@acme.com',
                role: 'ADMIN'
            }
        ];

        for (const user of users) {
            // Check if user already exists
            const [existing] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [user.email]
            );

            if (existing.length > 0) {
                console.log(`⚠️  User ${user.email} already exists, skipping...`);
                continue;
            }

            // Insert user
            const [result] = await pool.execute(
                `INSERT INTO users (company_id, name, email, password, role, status, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, 'Active', NOW(), NOW(), 0)`,
                [user.company_id, user.name, user.email, hashedPassword, user.role]
            );

            console.log(`✅ Created user: ${user.email} (ID: ${result.insertId})`);
        }

        console.log('\n✅ Default admin users created successfully!');
        console.log('\n📝 Login credentials:');
        console.log('   Email: admin@democompany.com');
        console.log('   Email: admin@acme.com');
        console.log('   Password: admin123');
        console.log('\n⚠️  Please change these passwords after first login!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating default users:', error);
        process.exit(1);
    }
}

createDefaultUsers();
