import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import app from './src/index.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sequelize } from './src/db/index.js';
import Role from './src/user/models/role.model.js';
import User from './src/user/models/user.model.js';

const PORT = process.env.PORT || 10000;

// Listener
app.listen(PORT, '0.0.0.0', async () => {
  try {
    // Sync DB tables (with alter: true to add new columns like min_stock)
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully.');

    // ----- CREATE DEFAULT ROLE -----
    let superAdminRole = await Role.findOne({ where: { role_name: 'super admin' } });
    if (!superAdminRole) {
      console.log('No roles found. Creating default "super admin" role...');
      superAdminRole = await Role.create({
        id: crypto.randomUUID(),
        role_name: 'super admin',
        description: 'All access will have',
        is_active: 1,
      });
      console.log('"Super admin" role created successfully.');
    } else {
      console.log('Super admin role already exists.');
    }

    // ----- CREATE DEFAULT USER -----
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('No users found. Creating default "Atelier" user...');
      const hashedPassword = await bcrypt.hash('12345678', 10);
      await User.create({
        id: crypto.randomUUID(),
        role_id: superAdminRole.id,
        username: 'Atelier',
        email: 'atelier@gmail.com',
        password: hashedPassword,
        phone: '9876543210',
        is_active: 1,
      });
      console.log('Default user "Atelier" created successfully.');
    } else {
      console.log(`Users table already has ${userCount} record(s).`);
    }

    console.log(`Server is running on port ${PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
});
