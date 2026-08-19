const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const seedDefaultData = async () => {
  try {
    const User = require("../models/User");
    const adminExists = await User.findOne({ email: "admin@teamup.com" });
    if (!adminExists) {
      await User.create({
        name: "TeamUp Admin",
        email: "admin@teamup.com",
        password: "admin123456",
        role: "admin",
      });
      console.log("🌱 Default Admin created: admin@teamup.com / admin123456");
    }

    const studentExists = await User.findOne({ email: "student@college.edu" });
    if (!studentExists) {
      await User.create({
        name: "Rahul Sharma",
        email: "student@college.edu",
        password: "student123",
        role: "student",
        college: "IIT Delhi",
        skills: ["React", "Node.js", "MongoDB", "UI/UX"],
      });
      console.log("🌱 Default Student created: student@college.edu / student123");
    }
  } catch (err) {
    console.warn(`⚠️ Auto-seeding note: ${err.message}`);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  try {
    if (!uri) throw new Error("No MONGO_URI specified in environment");
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await seedDefaultData();
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB connection failed (${error.message}).`);
    console.log(`🚀 Launching Automated In-Memory MongoDB Server...`);

    try {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ Automated MongoDB Connected: ${conn.connection.host}`);
      await seedDefaultData();
    } catch (memErr) {
      console.error(`❌ Failed to launch Database: ${memErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;


