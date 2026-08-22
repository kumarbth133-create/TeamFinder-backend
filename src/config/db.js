const mongoose = require("mongoose");

let isConnected = false;
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
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const uri =
    process.env.MONGO_URI ||
    "mongodb+srv://kumarbth133_db_user:p%40ssw0rd%279%27%21@cluster0.kgyowjt.mongodb.net/teamfinder?retryWrites=true&w=majority&appName=Cluster0";

  try {
    if (!uri) throw new Error("No MONGO_URI specified in environment");
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await seedDefaultData();
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB connection failed (${error.message}).`);

    // In local development only: fallback to in-memory mongodb
    if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
      try {
        console.log(`🚀 Launching Automated In-Memory MongoDB Server...`);
        const { MongoMemoryServer } = require("mongodb-memory-server");
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        const conn = await mongoose.connect(mongoUri);
        isConnected = true;
        console.log(`✅ Automated MongoDB Connected: ${conn.connection.host}`);
        await seedDefaultData();
      } catch (memErr) {
        console.error(`❌ Failed to launch In-Memory Database: ${memErr.message}`);
      }
    } else {
      console.error(`❌ MongoDB Connection Error on Vercel: Please set MONGO_URI in Vercel Environment Variables!`);
    }
  }
};

module.exports = connectDB;
