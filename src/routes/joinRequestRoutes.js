const express = require("express");
const router = express.Router();
const {
  sendJoinRequest,
  cancelJoinRequest,
  respondToJoinRequest,
  getReceivedRequests,
  getSentRequests,
} = require("../controllers/joinRequestController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, sendJoinRequest);
router.get("/received", protect, getReceivedRequests);
router.get("/sent", protect, getSentRequests);
router.put("/:id", protect, respondToJoinRequest);
router.delete("/:id", protect, cancelJoinRequest);

module.exports = router;
