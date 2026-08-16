const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./src/config/db");

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({ origin: "team-finder-backend.vercel.app", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Static folder for uploaded profile images
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// API Routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/projects", require("./src/routes/projectRoutes"));
app.use("/api/joinrequests", require("./src/routes/joinRequestRoutes"));
app.use("/api/notifications", require("./src/routes/notificationRoutes"));
app.use("/api/admin", require("./src/routes/adminRoutes"));
app.use("/api/mentors", require("./src/routes/mentorRoutes"));
app.use("/api/courses", require("./src/routes/courseRoutes"));

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "TeamUp API is running 🚀" });
});

// Global Error Handler
app.use(require("./src/middleware/errorMiddleware"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
