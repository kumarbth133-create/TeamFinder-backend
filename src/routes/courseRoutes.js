const express = require("express");
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
} = require("../controllers/courseController");
const { protect } = require("../middleware/authMiddleware");

router.route("/")
  .get(protect, getAllCourses)
  .post(protect, createCourse);

router.route("/:id")
  .get(protect, getCourseById);

module.exports = router;
