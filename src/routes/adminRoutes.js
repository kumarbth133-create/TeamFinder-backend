const express = require("express");
const router = express.Router();
const {
  adminLogin,
  getDashboardStats,
  getAllStudents,
  toggleStudentStatus,
  deleteStudent,
  getAllProjects,
  deleteProject,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/login", adminLogin);
router.get("/stats", protect, adminOnly, getDashboardStats);
router.get("/students", protect, adminOnly, getAllStudents);
router.put("/students/:id/toggle", protect, adminOnly, toggleStudentStatus);
router.delete("/students/:id", protect, adminOnly, deleteStudent);
router.get("/projects", protect, adminOnly, getAllProjects);
router.delete("/projects/:id", protect, adminOnly, deleteProject);

module.exports = router;
