const express = require("express");
const router = express.Router();
const {
  getAllStudents,
  getStudentById,
  updateProfile,
  uploadProfilePicture,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.get("/", protect, getAllStudents);
router.get("/:id", protect, getStudentById);
router.put("/profile", protect, updateProfile);
router.post("/upload-picture", protect, upload.single("profilePicture"), uploadProfilePicture);

module.exports = router;
