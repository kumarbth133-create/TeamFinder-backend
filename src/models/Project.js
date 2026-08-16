const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    skillsRequired: {
      type: [String],
      required: [true, "At least one skill is required"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teamMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    maxMembers: {
      type: Number,
      default: 5,
      min: [2, "Team must have at least 2 members"],
      max: [20, "Team cannot exceed 20 members"],
    },
    status: {
      type: String,
      enum: ["open", "closed", "completed"],
      default: "open",
    },
    githubRepo: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
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

module.exports = mongoose.model("Project", projectSchema);
