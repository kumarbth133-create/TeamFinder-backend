const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Mentor = require("../models/Mentor");
const Notification = require("../models/Notification");
const MentorRequest = require("../models/MentorRequest");
const User = require("../models/User");
const { sendEmail, generateMentorRequestEmail, buildDirectEmailLinks } = require("../utils/sendEmail");

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
    name: "Ankur Gill",
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
    name: "Kundan Gupta",
    email: "kundan80927@gmail.com",
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
    email: "nidhibharti2890@gmail.com",
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

  // Search by name, title, company or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
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
  const { topic, message, projectId } = req.body;
  const mentor = await Mentor.findById(req.params.id);

  if (!mentor) {
    res.status(404);
    throw new Error("Mentor not found");
  }

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  const actionToken = crypto.randomBytes(32).toString("hex");

  // Create MentorRequest record in database
  const mentorRequest = await MentorRequest.create({
    mentor: mentor._id,
    sender: req.user._id,
    project: projectId || undefined,
    topic: topic || "General Project & Career Guidance",
    message: message.trim(),
    mentorEmail: mentor.email,
    actionToken,
    status: "pending",
  });

  // Create notification for the student confirming request has been sent
  await Notification.create({
    recipient: req.user._id,
    mentor: mentor._id,
    mentorRequest: mentorRequest._id,
    type: "mentor_request_sent",
    title: `Mentorship Requested: ${mentor.name}`,
    message: `Your guidance request for "${mentorRequest.topic}" has been submitted to ${mentor.name}. You will be notified as soon as they respond!`,
  });

  res.json({
    success: true,
    message: `Mentorship guidance request submitted successfully to ${mentor.name}!`,
    data: mentorRequest,
  });
});

// @desc    Handle mentor Accept or Reject action from email link
// @route   GET /api/mentors/requests/action
// @route   POST /api/mentors/requests/action
// @access  Public (Authenticated via cryptographic actionToken)
const handleMentorEmailAction = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;
  const action = (req.query.action || req.body.action || "").toLowerCase();
  const feedback = req.body.feedback || "";

  if (!token) {
    res.status(400);
    throw new Error("Missing action token");
  }

  const mentorRequest = await MentorRequest.findOne({ actionToken: token })
    .populate("mentor")
    .populate("sender", "name email college skills profilePicture");

  if (!mentorRequest) {
    res.status(404);
    throw new Error("Mentorship request not found or token has expired");
  }

  // If only verifying token details (GET with no action)
  if (!action) {
    return res.json({
      success: true,
      data: mentorRequest,
    });
  }

  if (!["accept", "accepted", "reject", "rejected"].includes(action)) {
    res.status(400);
    throw new Error("Invalid action. Must be 'accept' or 'reject'");
  }

  const newStatus = action.startsWith("accept") ? "accepted" : "rejected";

  mentorRequest.status = newStatus;
  mentorRequest.respondedAt = new Date();
  if (feedback) mentorRequest.mentorFeedback = feedback;
  await mentorRequest.save();

  // Create real-time notification for the student
  if (newStatus === "accepted") {
    await Notification.create({
      recipient: mentorRequest.sender._id,
      mentor: mentorRequest.mentor._id,
      mentorRequest: mentorRequest._id,
      type: "mentor_request_accepted",
      title: "🎉 Mentor Request Accepted!",
      message: `Mentor ${mentorRequest.mentor.name} has ACCEPTED your mentorship request for "${mentorRequest.topic}"! They will connect with you at ${mentorRequest.sender.email}.`,
    });
  } else {
    await Notification.create({
      recipient: mentorRequest.sender._id,
      mentor: mentorRequest.mentor._id,
      mentorRequest: mentorRequest._id,
      type: "mentor_request_rejected",
      title: "Mentor Request Declined",
      message: `Mentor ${mentorRequest.mentor.name} was unable to accept your request for "${mentorRequest.topic}".`,
    });
  }

  res.json({
    success: true,
    message: `Mentorship request has been ${newStatus} successfully!`,
    data: mentorRequest,
  });
});

// @desc    Get all mentorship requests sent by logged in student
// @route   GET /api/mentors/requests/my
// @access  Private
const getMyMentorRequests = asyncHandler(async (req, res) => {
  const requests = await MentorRequest.find({ sender: req.user._id })
    .populate("mentor", "name email title company profilePicture rating experience availability")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Cancel a pending mentorship request
// @route   DELETE /api/mentors/requests/:id
// @access  Private
const cancelMentorRequest = asyncHandler(async (req, res) => {
  const request = await MentorRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error("Mentorship request not found");
  }

  if (request.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to cancel this request");
  }

  if (request.status !== "pending") {
    res.status(400);
    throw new Error("Only pending requests can be cancelled");
  }

  request.status = "cancelled";
  await request.save();

  res.json({
    success: true,
    message: "Mentorship request cancelled",
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

// @desc    Get mentor's received requests & dashboard data
// @route   GET /api/mentors/dashboard/me
// @access  Private (Mentor)
const getMentorDashboardData = asyncHandler(async (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  const mentorDoc = await Mentor.findOne({ email: userEmail });

  // Query all requests sent to this mentor's ID or email
  const query = {
    $or: [{ mentorEmail: userEmail }],
  };
  if (mentorDoc) {
    query.$or.push({ mentor: mentorDoc._id });
  }

  const requests = await MentorRequest.find(query)
    .populate("sender", "name email profilePicture college skills")
    .populate("mentor", "name title email")
    .sort("-createdAt");

  const total = requests.length;
  const pending = requests.filter((r) => r.status === "pending").length;
  const accepted = requests.filter((r) => r.status === "accepted").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  res.json({
    success: true,
    data: {
      mentor: mentorDoc || req.user,
      stats: {
        total,
        pending,
        accepted,
        rejected,
      },
      requests,
    },
  });
});

// @desc    Mentor responds to guidance request (Accept or Reject)
// @route   PUT /api/mentors/requests/:id/respond
// @access  Private (Mentor)
const respondMentorRequest = asyncHandler(async (req, res) => {
  const { status, feedback } = req.body;

  if (!status || !["accepted", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status. Must be 'accepted' or 'rejected'");
  }

  const request = await MentorRequest.findById(req.params.id)
    .populate("mentor", "name email title")
    .populate("sender", "name email");

  if (!request) {
    res.status(404);
    throw new Error("Mentorship request not found");
  }

  const userEmail = req.user.email.toLowerCase();
  const isAuthorized =
    request.mentorEmail === userEmail ||
    (request.mentor && request.mentor.email === userEmail) ||
    req.user.role === "admin";

  if (!isAuthorized) {
    res.status(403);
    throw new Error("Not authorized to respond to this mentor request");
  }

  request.status = status;
  if (feedback) request.mentorFeedback = feedback;
  await request.save();

  // Create real-time notification for student
  const mentorName = request.mentor?.name || req.user.name || "Mentor";
  const notifType = status === "accepted" ? "mentor_request_accepted" : "mentor_request_rejected";
  const notifTitle =
    status === "accepted"
      ? "🎉 Mentor Request Accepted!"
      : "Mentorship Request Update";
  const notifMessage =
    status === "accepted"
      ? `${mentorName} has ACCEPTED your mentorship guidance request for "${request.topic}"!`
      : `${mentorName} has declined your guidance request for "${request.topic}".`;

  await Notification.create({
    recipient: request.sender._id || request.sender,
    type: notifType,
    title: notifTitle,
    message: notifMessage,
    mentor: request.mentor?._id,
    mentorRequest: request._id,
  });

  res.json({
    success: true,
    message: `Mentorship request has been ${status}! Student is notified.`,
    data: request,
  });
});

module.exports = {
  getAllMentors,
  getMentorById,
  requestMentorship,
  handleMentorEmailAction,
  getMyMentorRequests,
  cancelMentorRequest,
  createMentor,
  getMentorDashboardData,
  respondMentorRequest,
};
