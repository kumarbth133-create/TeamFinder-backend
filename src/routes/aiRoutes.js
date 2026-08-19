const express = require("express");
const router = express.Router();
const { chatWithAI, getSuggestions } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// Protected routes
router.post("/chat", protect, chatWithAI);
router.get("/suggestions", protect, getSuggestions);

module.exports = router;
