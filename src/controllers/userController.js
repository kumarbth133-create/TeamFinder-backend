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
  const User = require("../models/User");
  const Mentor = require("../models/Mentor");
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Parse skills / expertise if sent as string
  let skills = req.body.skills;
  if (typeof skills === "string") {
    skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  let expertise = req.body.expertise;
  if (typeof expertise === "string") {
    expertise = expertise.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Update fields
  user.name = req.body.name || user.name;
  user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
  user.skills = skills || user.skills;
  user.githubLink = req.body.githubLink !== undefined ? req.body.githubLink : user.githubLink;
  user.linkedinLink = req.body.linkedinLink !== undefined ? req.body.linkedinLink : user.linkedinLink;
  user.college = req.body.college !== undefined ? req.body.college : user.college;
  user.title = req.body.title !== undefined ? req.body.title : user.title;
  user.company = req.body.company !== undefined ? req.body.company : user.company;
  user.experience = req.body.experience !== undefined ? req.body.experience : user.experience;
  if (expertise) user.expertise = expertise;

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

  // If mentor, sync with Mentor collection
  if (updatedUser.role === "mentor") {
    try {
      await Mentor.findOneAndUpdate(
        { email: updatedUser.email },
        {
          name: updatedUser.name,
          title: updatedUser.title || "Industry Mentor",
          company: updatedUser.company || "Independent Expert",
          experience: updatedUser.experience || "5+ Years",
          expertise: updatedUser.expertise?.length ? updatedUser.expertise : updatedUser.skills,
          bio: updatedUser.bio,
          githubLink: updatedUser.githubLink,
          linkedinLink: updatedUser.linkedinLink,
          profilePicture: updatedUser.profilePicture,
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn("Failed to sync updated mentor record:", err.message);
    }
  }

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      college: updatedUser.college,
      title: updatedUser.title,
      company: updatedUser.company,
      experience: updatedUser.experience,
      expertise: updatedUser.expertise,
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
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_API_NAME;
  let finalPictureUrl = "";

  // 1. Try uploading to Cloudinary if credentials are configured
  if (
    cloudName &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    try {
      const cloudinary = require("../config/cloudinary");
      const uploadToCloudinary = (buffer) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "teamup/profiles",
              transformation: [
                { width: 400, height: 400, crop: "fill", gravity: "face" },
                { quality: "auto", fetch_format: "auto" },
              ],
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(buffer);
        });
      };

      const result = await uploadToCloudinary(req.file.buffer);
      finalPictureUrl = result.secure_url;
    } catch (cloudErr) {
      console.warn("Cloudinary upload failed, falling back to base64:", cloudErr.message);
    }
  }

  // 2. Safe Fallback: If Cloudinary keys are not yet set in Vercel, use Base64 Data URI
  if (!finalPictureUrl) {
    const mimeType = req.file.mimetype || "image/jpeg";
    finalPictureUrl = `data:${mimeType};base64,${req.file.buffer.toString("base64")}`;
  }

  user.profilePicture = finalPictureUrl;
  const updatedUser = await user.save();

  // If mentor, sync with Mentor collection
  if (updatedUser.role === "mentor") {
    try {
      const Mentor = require("../models/Mentor");
      await Mentor.findOneAndUpdate(
        { email: updatedUser.email },
        { profilePicture: updatedUser.profilePicture }
      );
    } catch { /* silent */ }
  }

  res.json({
    success: true,
    message: "Profile picture uploaded successfully! 🎉",
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
