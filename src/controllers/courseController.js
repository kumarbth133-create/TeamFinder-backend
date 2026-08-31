const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");

// @desc    Get all courses (with search & subject filter)
// @route   GET /api/courses
// @access  Private
const getAllCourses = asyncHandler(async (req, res) => {
  const { search, subject } = req.query;

  let query = { isActive: true };

  if (subject && subject !== "All") {
    query.subject = { $regex: new RegExp(`^${subject}$`, "i") };
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  const courses = await Course.find(query).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course || !course.isActive) {
    res.status(404);
    throw new Error("Course not found");
  }

  res.json({
    success: true,
    data: course,
  });
});

// @desc    Create course
// @route   POST /api/courses
// @access  Private
const createCourse = asyncHandler(async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json({
    success: true,
    data: course,
  });
});

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
};