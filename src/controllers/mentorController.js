const asyncHandler = require("express-async-handler");
const Mentor = require("../models/Mentor");
const Notification = require("../models/Notification");

// Sample initial mentors to seed automatically if empty
const sampleMentors = [
  {
    name: "Gaurav Nagpal",
    email: "gaurav123@gmail.com",
    title: "Senior Full Stack & Cloud Architect",
    company: "Google / Tech Academy",
    experience: "5+ Years",
    bio: "Passionate about helping students build scalable web applications, React ecosystem, and microservices architecture. Always ready to guide on code reviews and project planning.",
    expertise: ["React", "Node.js", "System Design", "AWS", "MongoDB"],
    rating: 4.9,
    reviewsCount: 38,
    availability: "Available Weekends & Evenings",
    linkedinLink: "https://linkedin.com",
    githubLink: "https://github.com",
    sessionsCompleted: 42,
  },
  {
    name: "Kundan Gupta",
    email: "kumarbth133@gmail.com",
    title: "Lead AI/ML Engineer",
    company: "Microsoft",
    experience: "2+ Years",
    bio: "Specialist in Python, Deep Learning, NLP, and Computer Vision. I help student teams select right datasets, optimize model training, and integrate AI APIs into full stack projects.",
    expertise: ["Python", "PyTorch", "Machine Learning", "FastAPI", "Data Science"],
    rating: 4.8,
    reviewsCount: 29,
    availability: "Available for Project Reviews",
    linkedinLink: "https://linkedin.com",
    githubLink: "https://github.com/kumarbth133",
    sessionsCompleted: 31,
  },
  {
    name: "Gaurabh Nagpal",
    email: "priya.s@example.com",
    title: "UI/UX & Frontend Lead",
    company: "Design Studio",
    experience: "5+ Years",
    bio: "Helping students convert rough project ideas into visually stunning, accessible, and high-performance user interfaces. Expert in Tailwind CSS, React, and UX Design Principles.",
    expertise: ["UI/UX Design", "React", "Tailwind CSS", "Figma", "TypeScript"],
    rating: 5.0,
    reviewsCount: 45,
    availability: "Available 1-on-1 Sessions",
    linkedinLink: "https://linkedin.com",
    githubLink: "https://github.com",
    sessionsCompleted: 50,
  },
  {
    name: "Nidhi Bharti",
    email: "rohan.v@example.com",
    title: "DevOps & Backend Engineer",
    company: "Amazon Web Services",
    experience: "7+ Years",
    bio: "Helping project teams set up CI/CD pipelines, Docker containers, MongoDB database optimization, and deployment on AWS/Vercel/Render.",
    expertise: ["Node.js", "Docker", "DevOps", "PostgreSQL", "MongoDB", "Kubernetes"],
    rating: 4.9,
    reviewsCount: 24,
    availability: "Available for Architecture Guidance",
    linkedinLink: "https://linkedin.com",
    githubLink: "https://github.com",
    sessionsCompleted: 28,
  },
];

// @desc    Get all mentors (with search & expertise filter)
// @route   GET /api/mentors
// @access  Private
const getAllMentors = asyncHandler(async (req, res) => {
  const { search, expertise } = req.query;

  // Auto-seed if database is empty
  const count = await Mentor.countDocuments();
  if (count === 0) {
    await Mentor.insertMany(sampleMentors);
  }

  let query = { isActive: true };

  // Search by name, title, or company
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by expertise skills
  if (expertise) {
    const expArray = expertise.split(",").map((e) => e.trim());
    query.expertise = { $in: expArray };
  }

  const mentors = await Mentor.find(query).sort({ rating: -1, createdAt: -1 });

  res.json({
    success: true,
    count: mentors.length,
    data: mentors,
  });
});

// @desc    Get single mentor by ID
// @route   GET /api/mentors/:id
// @access  Private
const getMentorById = asyncHandler(async (req, res) => {
  const mentor = await Mentor.findById(req.params.id);

  if (!mentor || !mentor.isActive) {
    res.status(404);
    throw new Error("Mentor not found");
  }

  res.json({
    success: true,
    data: mentor,
  });
});

// @desc    Request mentorship / contact mentor
// @route   POST /api/mentors/:id/request
// @access  Private
const requestMentorship = asyncHandler(async (req, res) => {
  const { projectTitle, topic, message } = req.body;
  const mentor = await Mentor.findById(req.params.id);

  if (!mentor) {
    res.status(404);
    throw new Error("Mentor not found");
  }

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  // Send notification to the user confirming mentorship request submission
  await Notification.create({
    recipient: req.user._id,
    type: "system",
    title: `Mentorship Requested: ${mentor.name}`,
    message: `Your guidance request for "${topic || "General Project Guidance"}" has been sent to ${mentor.name}. They will review and get in touch via email.`,
  });

  res.json({
    success: true,
    message: `Mentorship request sent successfully to ${mentor.name}!`,
  });
});

// @desc    Create a new mentor (Admin/API)
// @route   POST /api/mentors
// @access  Private
const createMentor = asyncHandler(async (req, res) => {
  const { name, email, title, company, experience, bio, expertise, availability, linkedinLink, githubLink } = req.body;

  let expList = expertise;
  if (typeof expList === "string") {
    expList = expList.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const mentor = await Mentor.create({
    name,
    email,
    title,
    company,
    experience,
    bio,
    expertise: expList || [],
    availability,
    linkedinLink,
    githubLink,
  });

  res.status(201).json({
    success: true,
    data: mentor,
  });
});

module.exports = {
  getAllMentors,
  getMentorById,
  requestMentorship,
  createMentor,
};
