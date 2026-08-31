const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, college } = req.body;

  // Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email and password");
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    college: college || "",
  });

  if (user) {
    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        college: user.college,
        profilePicture: user.profilePicture,
        token: generateToken(user._id),
      },
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Register new mentor
// @route   POST /api/auth/register-mentor
// @access  Public
const registerMentor = asyncHandler(async (req, res) => {
  const Mentor = require("../models/Mentor");
  const {
    name,
    email,
    password,
    title,
    company,
    experience,
    expertise,
    bio,
    linkedinLink,
    githubLink,
    profilePicture,
  } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email and password");
  }

  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  const expertiseArray = Array.isArray(expertise)
    ? expertise
    : typeof expertise === "string"
    ? expertise.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Technical Guidance", "Code Review"];

  // 1. Create User with role mentor
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: "mentor",
    title: title || "Industry Mentor",
    company: company || "Independent Expert",
    experience: experience || "5+ Years",
    expertise: expertiseArray,
    bio: bio || "Passionate about mentoring next-gen developers and student project teams.",
    linkedinLink: linkedinLink || "",
    githubLink: githubLink || "",
    profilePicture: profilePicture || "",
  });

  // 2. Also create/sync public Mentor listing
  try {
    await Mentor.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        name,
        email: email.toLowerCase(),
        title: title || "Industry Mentor",
        company: company || "Independent Expert",
        experience: experience || "5+ Years",
        expertise: expertiseArray,
        bio: bio || "Passionate about mentoring next-gen developers and student project teams.",
        linkedinLink: linkedinLink || "",
        githubLink: githubLink || "",
        profilePicture: profilePicture || "",
        isActive: true,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn("Failed to sync Mentor record:", err.message);
  }

  res.status(201).json({
    success: true,
    message: "Mentor registration successful! Welcome to TeamUp.",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      company: user.company,
      experience: user.experience,
      expertise: user.expertise,
      bio: user.bio,
      linkedinLink: user.linkedinLink,
      githubLink: user.githubLink,
      profilePicture: user.profilePicture,
      token: generateToken(user._id),
    },
  });
});

// @desc    Login user (Student, Mentor, Admin)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  // Find user with password field included
  let user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  // If not found in User collection, check if email exists in Mentor seed collection
  if (!user) {
    const Mentor = require("../models/Mentor");
    const mentorRecord = await Mentor.findOne({ email: email.toLowerCase() });
    if (mentorRecord) {
      // Auto-create User entry for this mentor so they can log in seamlessly
      user = await User.create({
        name: mentorRecord.name,
        email: mentorRecord.email.toLowerCase(),
        password: password, // set password as entered
        role: "mentor",
        title: mentorRecord.title,
        company: mentorRecord.company,
        experience: mentorRecord.experience,
        expertise: mentorRecord.expertise,
        bio: mentorRecord.bio,
        profilePicture: mentorRecord.profilePicture,
      });
    }
  }

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    res.status(401);
    throw new Error("Your account has been deactivated. Contact admin.");
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    success: true,
    message: "Login successful",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      college: user.college,
      title: user.title,
      company: user.company,
      experience: user.experience,
      expertise: user.expertise,
      profilePicture: user.profilePicture,
      bio: user.bio,
      skills: user.skills,
      githubLink: user.githubLink,
      linkedinLink: user.linkedinLink,
      token: generateToken(user._id),
    },
  });
});

// @desc    Verify email for forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Please enter your registered email address");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(404);
    throw new Error("No account found with this email address");
  }

  res.json({
    success: true,
    message: "Email verified successfully. You can now reset your password.",
    data: { email: user.email },
  });
});

// @desc    Reset password with new password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    res.status(400);
    throw new Error("Email and new password are required");
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters long");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: "Password reset successful! You can now log in with your new password.",
  });
});

// @desc    Get current logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    success: true,
    data: user,
  });
});

// @desc    Get public stats (student, project, & skill counts)
// @route   GET /api/auth/stats
// @access  Public
const getPublicStats = asyncHandler(async (req, res) => {
  const Project = require("../models/Project");
  const JoinRequest = require("../models/JoinRequest");

  const totalStudents = await User.countDocuments({ role: "student" });
  const totalProjects = await Project.countDocuments();
  
  // Calculate total skills matched/listed across users and projects
  const users = await User.find({ role: "student" }).select("skills");
  let totalSkillsMatched = 0;
  users.forEach((u) => {
    if (u.skills && Array.isArray(u.skills)) {
      totalSkillsMatched += u.skills.length;
    }
  });

  // Fixed evaluation accuracy at 99%
  const evaluationAccuracy = 99;

  res.json({
    success: true,
    data: {
      totalStudents,
      totalProjects,
      totalSkillsMatched,
      evaluationAccuracy,
    },
  });
});

module.exports = {
  registerUser,
  registerMentor,
  loginUser,
  forgotPassword,
  resetPassword,
  getMe,
  getPublicStats,
};
