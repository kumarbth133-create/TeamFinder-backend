const express = require("express");
const router = express.Router();
const {
  getAllMentors,
  getMentorById,
  requestMentorship,
  createMentor,
} = require("../controllers/mentorController");
const { protect } = require("../middleware/authMiddleware");

router.route("/")
  .get(protect, getAllMentors)
  .post(protect, createMentor);

router.route("/:id")
  .get(protect, getMentorById);

router.route("/:id/request")
  .post(protect, requestMentorship);

module.exports = router;
