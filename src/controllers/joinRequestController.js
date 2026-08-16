const asyncHandler = require("express-async-handler");
const JoinRequest = require("../models/JoinRequest");
const Project = require("../models/Project");
const Notification = require("../models/Notification");

// @desc    Send join request
// @route   POST /api/joinrequests
// @access  Private
const sendJoinRequest = asyncHandler(async (req, res) => {
  const { projectId, message } = req.body;

  if (!projectId) {
    res.status(400);
    throw new Error("Project ID is required");
  }

  const project = await Project.findById(projectId);
  if (!project || !project.isActive) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Owner cannot send request to own project
  if (project.owner.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot send a join request to your own project");
  }

  // Check if already a team member
  if (project.teamMembers.includes(req.user._id)) {
    res.status(400);
    throw new Error("You are already a member of this project");
  }

  // Check if project is open
  if (project.status !== "open") {
    res.status(400);
    throw new Error("This project is not accepting new members");
  }

  // Check team size limit
  if (project.teamMembers.length >= project.maxMembers) {
    res.status(400);
    throw new Error("Project team is already full");
  }

  // Check if request already exists
  const existingRequest = await JoinRequest.findOne({
    project: projectId,
    sender: req.user._id,
  });

  if (existingRequest) {
    if (existingRequest.status === "pending") {
      res.status(400);
      throw new Error("You have already sent a join request for this project");
    }
    if (existingRequest.status === "accepted") {
      res.status(400);
      throw new Error("Your request was already accepted");
    }
    // If rejected, allow re-request
    existingRequest.status = "pending";
    existingRequest.message = message || "";
    await existingRequest.save();

    // Create notification for project owner
    await Notification.create({
      recipient: project.owner,
      sender: req.user._id,
      type: "join_request_sent",
      message: `${req.user.name} sent a join request for your project "${project.title}"`,
      project: project._id,
    });

    return res.json({
      success: true,
      message: "Join request re-sent successfully",
      data: existingRequest,
    });
  }

  // Create new join request
  const joinRequest = await JoinRequest.create({
    project: projectId,
    sender: req.user._id,
    receiver: project.owner,
    message: message || "",
  });

  // Notify the project owner
  await Notification.create({
    recipient: project.owner,
    sender: req.user._id,
    type: "join_request_sent",
    message: `${req.user.name} sent a join request for your project "${project.title}"`,
    project: project._id,
  });

  res.status(201).json({
    success: true,
    message: "Join request sent successfully",
    data: joinRequest,
  });
});

// @desc    Cancel join request
// @route   DELETE /api/joinrequests/:id
// @access  Private (Sender only)
const cancelJoinRequest = asyncHandler(async (req, res) => {
  const joinRequest = await JoinRequest.findById(req.params.id).populate("project");

  if (!joinRequest) {
    res.status(404);
    throw new Error("Join request not found");
  }

  if (joinRequest.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to cancel this request");
  }

  if (joinRequest.status !== "pending") {
    res.status(400);
    throw new Error("You can only cancel pending requests");
  }

  await joinRequest.deleteOne();

  res.json({
    success: true,
    message: "Join request cancelled successfully",
  });
});

// @desc    Accept or Reject join request
// @route   PUT /api/joinrequests/:id
// @access  Private (Project Owner only)
const respondToJoinRequest = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !["accepted", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Please provide valid status: accepted or rejected");
  }

  const joinRequest = await JoinRequest.findById(req.params.id)
    .populate("sender", "name")
    .populate("project");

  if (!joinRequest) {
    res.status(404);
    throw new Error("Join request not found");
  }

  // Only project owner can respond
  if (joinRequest.receiver.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to respond to this request");
  }

  if (joinRequest.status !== "pending") {
    res.status(400);
    throw new Error("This request has already been responded to");
  }

  joinRequest.status = status;
  await joinRequest.save();

  if (status === "accepted") {
    // Add sender to project team members
    await Project.findByIdAndUpdate(joinRequest.project._id, {
      $addToSet: { teamMembers: joinRequest.sender._id },
    });

    // Notify sender - accepted
    await Notification.create({
      recipient: joinRequest.sender._id,
      sender: req.user._id,
      type: "join_request_accepted",
      message: `Your join request for project "${joinRequest.project.title}" has been accepted! 🎉`,
      project: joinRequest.project._id,
    });
  } else {
    // Notify sender - rejected
    await Notification.create({
      recipient: joinRequest.sender._id,
      sender: req.user._id,
      type: "join_request_rejected",
      message: `Your join request for project "${joinRequest.project.title}" was rejected.`,
      project: joinRequest.project._id,
    });
  }

  res.json({
    success: true,
    message: `Join request ${status} successfully`,
    data: joinRequest,
  });
});

// @desc    Get all join requests received (for project owner)
// @route   GET /api/joinrequests/received
// @access  Private
const getReceivedRequests = asyncHandler(async (req, res) => {
  const requests = await JoinRequest.find({ receiver: req.user._id })
    .populate("sender", "name email profilePicture skills college bio")
    .populate("project", "title skillsRequired")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Get all join requests sent (by current user)
// @route   GET /api/joinrequests/sent
// @access  Private
const getSentRequests = asyncHandler(async (req, res) => {
  const requests = await JoinRequest.find({ sender: req.user._id })
    .populate("project", "title skillsRequired status owner")
    .populate("receiver", "name email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

module.exports = {
  sendJoinRequest,
  cancelJoinRequest,
  respondToJoinRequest,
  getReceivedRequests,
  getSentRequests,
};
