const express = require("express");
const router = express.Router();
const {
  getAllMentors,
  getMentorById,
  requestMentorship,
  handleMentorEmailAction,
  getMyMentorRequests,
  cancelMentorRequest,
  createMentor,
  getMentorDashboardData,
  respondMentorRequest,
} = require("../controllers/mentorController");
const { protect } = require("../middleware/authMiddleware");

// Public action route for mentors clicking Accept/Reject links in email
router.route("/requests/action")
  .get(handleMentorEmailAction)
  .post(handleMentorEmailAction);

// Mentor dashboard & response routes
router.route("/dashboard/me")
  .get(protect, getMentorDashboardData);

router.route("/requests/:id/respond")
  .put(protect, respondMentorRequest);

// Student mentorship requests routes
router.route("/requests/my")
  .get(protect, getMyMentorRequests);

router.route("/requests/:id")
  .delete(protect, cancelMentorRequest);

// Mentor general routes
router.route("/")
  .get(protect, getAllMentors)
  .post(protect, createMentor);

router.route("/:id")
  .get(protect, getMentorById);

router.route("/:id/request")
  .post(protect, requestMentorship);

module.exports = router;
