const asyncHandler = require("express-async-handler");
const Project = require("../models/Project");
const JoinRequest = require("../models/JoinRequest");

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  const { title, description, skillsRequired, maxMembers, githubRepo, tags } =
    req.body;

  if (!title || !description || !skillsRequired) {
    res.status(400);
    throw new Error("Title, description and skills are required");
  }

  // Parse skillsRequired if sent as string
  let skills = skillsRequired;
  if (typeof skills === "string") {
    skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const project = await Project.create({
    title,
    description,
    skillsRequired: skills,
    owner: req.user._id,
    maxMembers: maxMembers || 5,
    githubRepo: githubRepo || "",
    tags: tags || [],
    teamMembers: [req.user._id], // Owner is first member
  });

  await project.populate("owner", "name email profilePicture college");

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    data: project,
  });
});

// @desc    Get all projects (with search & filter)
// @route   GET /api/projects
// @access  Private
const getAllProjects = asyncHandler(async (req, res) => {
  const { search, skills, status } = req.query;

  let query = { isActive: true };

  // Search by title or description
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by required skills
  if (skills) {
    const skillsArray = skills.split(",").map((s) => s.trim());
    query.skillsRequired = { $in: skillsArray };
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  const projects = await Project.find(query)
    .populate("owner", "name email profilePicture college")
    .populate("teamMembers", "name email profilePicture")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: projects.length,
    data: projects,
  });
});

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("owner", "name email profilePicture college bio githubLink linkedinLink")
    .populate("teamMembers", "name email profilePicture college skills");

  if (!project || !project.isActive) {
    res.status(404);
    throw new Error("Project not found");
  }

  res.json({
    success: true,
    data: project,
  });
});

// @desc    Get projects created by logged-in user
// @route   GET /api/projects/my-projects
// @access  Private
const getMyProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    owner: req.user._id,
    isActive: true,
  })
    .populate("teamMembers", "name email profilePicture")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: projects.length,
    data: projects,
  });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Owner only)
const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project || !project.isActive) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Only owner can update
  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to update this project");
  }

  // Parse skillsRequired if sent as string
  let skills = req.body.skillsRequired;
  if (typeof skills === "string") {
    skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  project.title = req.body.title || project.title;
  project.description = req.body.description || project.description;
  project.skillsRequired = skills || project.skillsRequired;
  project.maxMembers = req.body.maxMembers || project.maxMembers;
  project.status = req.body.status || project.status;
  project.githubRepo = req.body.githubRepo !== undefined ? req.body.githubRepo : project.githubRepo;
  project.tags = req.body.tags || project.tags;

  const updatedProject = await project.save();
  await updatedProject.populate("owner", "name email profilePicture");
  await updatedProject.populate("teamMembers", "name email profilePicture");

  res.json({
    success: true,
    message: "Project updated successfully",
    data: updatedProject,
  });
});

// @desc    Delete project (soft delete)
// @route   DELETE /api/projects/:id
// @access  Private (Owner only)
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project || !project.isActive) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Only owner can delete
  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to delete this project");
  }

  // Soft delete
  project.isActive = false;
  await project.save();

  // Also delete all join requests for this project
  await JoinRequest.deleteMany({ project: req.params.id });

  res.json({
    success: true,
    message: "Project deleted successfully",
  });
});

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  getMyProjects,
  updateProject,
  deleteProject,
};
