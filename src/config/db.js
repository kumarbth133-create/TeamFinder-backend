const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  try {
    // Attempt standard connection (Atlas or Local Mongo)
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB connection failed (${error.message}).`);
    console.log(`🚀 Launching Automated In-Memory MongoDB Server...`);

    try {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ Automated MongoDB Connected: ${conn.connection.host}`);
    } catch (memErr) {
      console.error(`❌ Failed to launch Database: ${memErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;

