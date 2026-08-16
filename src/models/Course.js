const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"], // e.g. HTML, CSS, JavaScript, React, Node.js, Python, DSA, MongoDB, Git
    },
    description: {
      type: String,
      default: "",
    },
    instructor: {
      type: String,
      default: "Tech Educator",
    },
    youtubeUrl: {
      type: String,
      required: [true, "YouTube URL is required"],
    },
    youtubeEmbedId: {
      type: String,
      required: [true, "YouTube Embed ID is required"],
    },
    duration: {
      type: String,
      default: "2 Hours",
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    viewsCount: {
      type: Number,
      default: 1250,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      default: 0, // 0 for free, 149 for premium
    },
    isActive: {
      type: Boolean,
      default: true,
    },

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);
