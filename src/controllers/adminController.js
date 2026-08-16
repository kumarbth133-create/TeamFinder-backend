const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Project = require("../models/Project");
const JoinRequest = require("../models/JoinRequest");
const Notification = require("../models/Notification");
const generateToken = require("../utils/generateToken");

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const admin = await User.findOne({ email, role: "admin" }).select("+password");

  if (!admin) {
    res.status(401);
    throw new Error("Invalid admin credentials");
  }

  const isMatch = await admin.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid admin credentials");
  }

  res.json({
    success: true,
    message: "Admin login successful",
    data: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id),
    },
  });
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalProjects,
    totalJoinRequests,
    pendingRequests,
    activeProjects,
    recentStudents,
    recentProjects,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    Project.countDocuments({ isActive: true }),
    JoinRequest.countDocuments(),
    JoinRequest.countDocuments({ status: "pending" }),
    Project.countDocuments({ isActive: true, status: "open" }),
    User.find({ role: "student" }).sort({ createdAt: -1 }).limit(5).select("name email college createdAt"),
    Project.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).populate("owner", "name").select("title status createdAt owner"),
  ]);

  res.json({
    success: true,
    data: {
      totalStudents,
      totalProjects,
      totalJoinRequests,
      pendingRequests,
      activeProjects,
      recentStudents,
      recentProjects,
    },
  });
});

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private (Admin)
const getAllStudents = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let query = { role: "student" };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { college: { $regex: search, $options: "i" } },
    ];
  }

  const students = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: students.length,
    data: students,
  });
});

// @desc    Toggle student active status (ban/unban)
// @route   PUT /api/admin/students/:id/toggle
// @access  Private (Admin)
const toggleStudentStatus = asyncHandler(async (req, res) => {
  const student = await User.findById(req.params.id);

  if (!student || student.role !== "student") {
    res.status(404);
    throw new Error("Student not found");
  }

  student.isActive = !student.isActive;
  await student.save();

  res.json({
    success: true,
    message: `Student ${student.isActive ? "activated" : "deactivated"} successfully`,
    data: { isActive: student.isActive },
  });
});

// @desc    Delete student permanently
// @route   DELETE /api/admin/students/:id
// @access  Private (Admin)
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await User.findById(req.params.id);

  if (!student || student.role !== "student") {
    res.status(404);
    throw new Error("Student not found");
  }

  // Delete student's projects, join requests, notifications
  await Project.updateMany({ isActive: true }, { $pull: { teamMembers: student._id } });
  await Project.updateMany({ owner: student._id }, { isActive: false });
  await JoinRequest.deleteMany({
    $or: [{ sender: student._id }, { receiver: student._id }],
  });
  await Notification.deleteMany({
    $or: [{ recipient: student._id }, { sender: student._id }],
  });

  await student.deleteOne();

  res.json({
    success: true,
    message: "Student deleted permanently",
  });
});

// @desc    Get all projects
// @route   GET /api/admin/projects
// @access  Private (Admin)
const getAllProjects = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const projects = await Project.find(query)
    .populate("owner", "name email")
    .populate("teamMembers", "name email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: projects.length,
    data: projects,
  });
});

// @desc    Delete project permanently
// @route   DELETE /api/admin/projects/:id
// @access  Private (Admin)
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  await JoinRequest.deleteMany({ project: project._id });
  await project.deleteOne();

  res.json({
    success: true,
    message: "Project deleted permanently",
  });
});

module.exports = {
  adminLogin,
  getDashboardStats,
  getAllStudents,
  toggleStudentStatus,
  deleteStudent,
  getAllProjects,
  deleteProject,
};
