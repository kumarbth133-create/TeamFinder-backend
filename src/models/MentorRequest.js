const mongoose = require("mongoose");
const crypto = require("crypto");

const mentorRequestSchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    topic: {
      type: String,
      required: [true, "Guidance topic is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
    actionToken: {
      type: String,
      unique: true,
      index: true,
    },
    mentorEmail: {
      type: String,
      lowercase: true,
    },
    respondedAt: {
      type: Date,
    },
    mentorFeedback: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate actionToken if not provided
mentorRequestSchema.pre("save", function (next) {
  if (!this.actionToken) {
    this.actionToken = crypto.randomBytes(32).toString("hex");
  }
  next();
});

module.exports = mongoose.model("MentorRequest", mentorRequestSchema);
