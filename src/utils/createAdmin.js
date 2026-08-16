/**
 * Run this script ONCE to create the first admin user:
 * node src/utils/createAdmin.js
 */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const User = require("../models/User");

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: "admin@teamup.com" });
  if (existing) {
    console.log("✅ Admin already exists!");
    process.exit(0);
  }

  const admin = await User.create({
    name: "TeamUp Admin",
    email: "admin@teamup.com",
    password: "admin123456",
    role: "admin",
  });

  console.log("✅ Admin created successfully!");
  console.log("   Email:    admin@teamup.com");
  console.log("   Password: admin123456");
  process.exit(0);
};

createAdmin().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
