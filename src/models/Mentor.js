const mongoose = require("mongoose");

const mentorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
    },
    title: {
      type: String,
      required: [true, "Title/Designation is required"],
    },
    company: {
      type: String,
      default: "Independent Mentor",
    },
    experience: {
      type: String,
      default: "5+ Years",
    },
    bio: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    expertise: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 4.9,
    },
    reviewsCount: {
      type: Number,
      default: 15,
    },
    availability: {
      type: String,
      default: "Available for Guidance",
    },
    githubLink: {
      type: String,
      default: "",
    },
    linkedinLink: {
      type: String,
      default: "",
    },
    sessionsCompleted: {
      type: Number,
      default: 24,
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

module.exports = mongoose.model("Mentor", mentorSchema);
