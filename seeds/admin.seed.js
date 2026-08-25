const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db.config');
const Admin = require('../models/admin.model');

const DEFAULT_ADMIN_EMAIL = 'admin@concord.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

const seedAdmin = async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for seeding');
  }

  let admin = await Admin.findOne({ email });

  if (admin) {
    admin.password = password;
    await admin.save();
    console.log(`✅ Admin updated: ${email}`);
  } else {
    admin = await Admin.create({ email, password });
    console.log(`✅ Admin created: ${email}`);
  }

  console.log('Seed completed successfully');
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(`❌ Seed failed: ${error.message}`);
  process.exit(1);
});
