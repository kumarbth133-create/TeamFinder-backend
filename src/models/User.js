const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password in queries
    },
    role: {
      type: String,
      enum: ["student", "mentor", "admin"],
      default: "student",
    },
    title: {
      type: String,
      default: "",
    },
    company: {
      type: String,
      default: "",
    },
    experience: {
      type: String,
      default: "3+ Years",
    },
    expertise: {
      type: [String],
      default: [],
    },
    availability: {
      type: String,
      default: "Available for Guidance",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    githubLink: {
      type: String,
      default: "",
    },
    linkedinLink: {
      type: String,
      default: "",
    },
    college: {
      type: String,
      default: "",
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
