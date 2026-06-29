-- =====================================================
-- Seed Data for CRM Database
-- Creates default companies and admin users
-- =====================================================

-- Insert default companies
INSERT INTO `companies` (`id`, `name`, `logo`, `currency`, `timezone`, `package_id`, `created_at`, `updated_at`, `is_deleted`) VALUES
(1, 'Demo Company', NULL, 'USD', 'UTC', NULL, NOW(), NOW(), 0),
(2, 'Acme Corporation', NULL, 'USD', 'America/New_York', NULL, NOW(), NOW(), 0),
(3, 'Tech Solutions Inc', NULL, 'EUR', 'Europe/London', NULL, NOW(), NOW(), 0);

-- Insert default admin users (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO `users` (`id`, `company_id`, `name`, `email`, `password`, `role`, `status`, `avatar`, `phone`, `address`, `created_at`, `updated_at`, `is_deleted`) VALUES
(1, 1, 'Admin User', 'admin@democompany.com', '$2b$10$rKj5YvVvVvVvVvVvVvVvVeJ5YvVvVvVvVvVvVvVvVvVvVvVvVvVvVu', 'ADMIN', 'Active', NULL, NULL, NULL, NOW(), NOW(), 0),
(2, 2, 'John Doe', 'admin@acme.com', '$2b$10$rKj5YvVvVvVvVvVvVvVvVeJ5YvVvVvVvVvVvVvVvVvVvVvVvVvVvVu', 'ADMIN', 'Active', NULL, '+1-555-0100', '123 Main St, New York, NY', NOW(), NOW(), 0),
(3, 3, 'Jane Smith', 'admin@techsolutions.com', '$2b$10$rKj5YvVvVvVvVvVvVvVvVeJ5YvVvVvVvVvVvVvVvVvVvVvVvVvVvVu', 'ADMIN', 'Active', NULL, '+44-20-1234-5678', '456 Tech Park, London, UK', NOW(), NOW(), 0);

-- Note: The password hashes above are placeholders. 
-- In a real scenario, you should generate proper bcrypt hashes.
-- For testing, you can use the auth/register endpoint to create users with proper password hashing.

SELECT 'Seed data inserted successfully!' as message;
