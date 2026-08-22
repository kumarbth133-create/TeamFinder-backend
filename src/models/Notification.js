const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: [
        "join_request_sent",
        "join_request_accepted",
        "join_request_rejected",
        "join_request_cancelled",
        "project_update",
        "mentor_request_sent",
        "mentor_request_accepted",
        "mentor_request_rejected",
        "system",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor",
    },
    mentorRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MentorRequest",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
