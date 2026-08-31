const mongoose = require("mongoose");
const dns = require("dns");

// Set reliable public DNS servers (Google & Cloudflare) to prevent SRV lookup ECONNREFUSED issues on local ISP networks
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (e) {
  // Silent fallback in restricted environments
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

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
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri =
      process.env.MONGO_URI ||
      "mongodb+srv://kumarbth133_db_user:alEEWUYPZsQ4Saxa@teamup.0wgc1zm.mongodb.net/teamfinder?retryWrites=true&w=majority&appName=Teamup";

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(uri, opts).then(async (mongooseInstance) => {
      console.log(`✅ MongoDB Connected: ${mongooseInstance.connection.host}`);
      await seedDefaultData();
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
