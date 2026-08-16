const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");

// @desc    Get all students (with search & filter)
// @route   GET /api/users
// @access  Private
const getAllStudents = asyncHandler(async (req, res) => {
  const { search, skills } = req.query;

  let query = { role: "student", isActive: true, _id: { $ne: req.user._id } };

  // Search by name or college
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { college: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by skills
  if (skills) {
    const skillsArray = skills.split(",").map((s) => s.trim());
    query.skills = { $in: skillsArray };
  }

  const users = await User.find(query).select(
    "-password"
  ).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: users.length,
    data: users,
  });
});

// @desc    Get single student profile by ID
// @route   GET /api/users/:id
// @access  Private
const getStudentById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user || !user.isActive) {
    res.status(404);
    throw new Error("Student not found");
  }

  res.json({
    success: true,
    data: user,
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Parse skills if sent as string
  let skills = req.body.skills;
  if (typeof skills === "string") {
    skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Update fields
  user.name = req.body.name || user.name;
  user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
  user.skills = skills || user.skills;
  user.githubLink = req.body.githubLink !== undefined ? req.body.githubLink : user.githubLink;
  user.linkedinLink = req.body.linkedinLink !== undefined ? req.body.linkedinLink : user.linkedinLink;
  user.college = req.body.college !== undefined ? req.body.college : user.college;
  if (req.body.profilePicture !== undefined) {
    user.profilePicture = req.body.profilePicture;
  }

  // Handle password update
  if (req.body.password) {
    if (req.body.password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      college: updatedUser.college,
      profilePicture: updatedUser.profilePicture,
      bio: updatedUser.bio,
      skills: updatedUser.skills,
      githubLink: updatedUser.githubLink,
      linkedinLink: updatedUser.linkedinLink,
    },
  });
});

// @desc    Upload profile picture
// @route   POST /api/users/upload-picture
// @access  Private
const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Please upload an image file");
  }

  const user = await User.findById(req.user._id);

  // Delete old profile picture if it exists locally
  if (user.profilePicture && user.profilePicture.startsWith("/uploads")) {
    const oldPicPath = path.join(
      __dirname,
      "../uploads/profiles",
      path.basename(user.profilePicture)
    );
    try {
      if (fs.existsSync(oldPicPath)) {
        fs.unlinkSync(oldPicPath);
      }
    } catch { /* silent */ }
  }

  // Save new picture path
  user.profilePicture = `/uploads/profiles/${req.file.filename}`;
  const updatedUser = await user.save();

  res.json({
    success: true,
    message: "Profile picture updated successfully",
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      college: updatedUser.college,
      profilePicture: updatedUser.profilePicture,
      bio: updatedUser.bio,
      skills: updatedUser.skills,
      githubLink: updatedUser.githubLink,
      linkedinLink: updatedUser.linkedinLink,
    },
  });
});

module.exports = {
  getAllStudents,
  getStudentById,
  updateProfile,
  uploadProfilePicture,
};
