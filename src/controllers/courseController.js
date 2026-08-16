const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");

// Curated technical courses with real working YouTube tutorial URLs & embed IDs
const sampleCourses = [
  {
    title: "HTML5 Full Course - Build Modern Web Pages",
    subject: "HTML",
    description: "Learn HTML5 from absolute scratch. Master semantic tags, forms, input types, tables, audio/video elements, and SEO best practices for web development.",
    instructor: "FreeCodeCamp / Tech Academy",
    youtubeUrl: "https://www.youtube.com/watch?v=kUMe1FH4CHE",
    youtubeEmbedId: "kUMe1FH4CHE",
    duration: "4 Hours",
    level: "Beginner",
    thumbnail: "https://img.youtube.com/vi/kUMe1FH4CHE/hqdefault.jpg",
    tags: ["HTML5", "Web Development", "Semantic HTML", "Frontend"],
    rating: 4.9,
    viewsCount: 2400,
    isPremium: false,
    price: 0,
  },
  {
    title: "CSS3 & Modern Flexbox/Grid Masterclass",
    subject: "CSS",
    description: "Complete CSS3 tutorial covering flexbox, grid, animations, responsive design, media queries, and custom CSS variables.",
    instructor: "Traversy Media",
    youtubeUrl: "https://www.youtube.com/watch?v=OXGznpKZ_sA",
    youtubeEmbedId: "OXGznpKZ_sA",
    duration: "5 Hours",
    level: "Beginner",
    thumbnail: "https://img.youtube.com/vi/OXGznpKZ_sA/hqdefault.jpg",
    tags: ["CSS3", "Flexbox", "CSS Grid", "Responsive Design"],
    rating: 4.8,
    viewsCount: 3100,
    isPremium: false,
    price: 0,
  },
  {
    title: "JavaScript (JS) Complete Beginner to Advanced",
    subject: "JavaScript",
    description: "Master modern JavaScript (ES6+). Learn variables, async/await, promises, DOM manipulation, closures, higher-order functions, and fetch API.",
    instructor: "CodeWithHarry",
    youtubeUrl: "https://www.youtube.com/watch?v=chx9Rs41W6g",
    youtubeEmbedId: "chx9Rs41W6g",
    duration: "7 Hours",
    level: "Beginner",
    thumbnail: "https://img.youtube.com/vi/chx9Rs41W6g/hqdefault.jpg",
    tags: ["JavaScript", "ES6", "DOM", "Async JS", "Frontend"],
    rating: 4.9,
    viewsCount: 5200,
    isPremium: false,
    price: 0,
  },
  {
    title: "React.js Complete Course 2024 (Hooks, State & Projects)",
    subject: "React",
    description: "Learn React.js step-by-step. Master components, JSX, useState, useEffect, useContext, React Router, custom hooks, and API integration.",
    instructor: "Apna College / Tech Guide",
    youtubeUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8",
    youtubeEmbedId: "bMknfKXIFA8",
    duration: "10 Hours",
    level: "Intermediate",
    thumbnail: "https://img.youtube.com/vi/bMknfKXIFA8/hqdefault.jpg",
    tags: ["React", "Hooks", "JSX", "Single Page Application", "Frontend"],
    rating: 5.0,
    viewsCount: 6800,
    isPremium: false,
    price: 0,
  },
  {
    title: "Node.js & Express.js Backend Crash Course",
    subject: "Node.js",
    description: "Build robust REST APIs with Node.js & Express. Learn middleware, routing, JWT authentication, error handling, and MongoDB connection.",
    instructor: "Programming with Mosh",
    youtubeUrl: "https://www.youtube.com/watch?v=TlB_eWDSMt4",
    youtubeEmbedId: "TlB_eWDSMt4",
    duration: "4.5 Hours",
    level: "Intermediate",
    thumbnail: "https://img.youtube.com/vi/TlB_eWDSMt4/hqdefault.jpg",
    tags: ["Node.js", "Express", "REST API", "Backend", "JWT"],
    rating: 4.9,
    viewsCount: 4200,
    isPremium: false,
    price: 0,
  },
  {
    title: "Spring Boot & Microservices Masterclass",
    subject: "Spring Boot",
    description: "Enterprise Java backend development with Spring Boot, Spring Security, REST APIs, JPA/Hibernate, and Microservices Architecture.",
    instructor: "Telusko / Java Brains",
    youtubeUrl: "https://www.youtube.com/watch?v=vtPkZShrvXQ",
    youtubeEmbedId: "vtPkZShrvXQ",
    duration: "8.5 Hours",
    level: "Advanced",
    thumbnail: "https://img.youtube.com/vi/vtPkZShrvXQ/hqdefault.jpg",
    tags: ["Spring Boot", "Java", "Microservices", "REST API", "Enterprise"],
    rating: 5.0,
    viewsCount: 5400,
    isPremium: true,
    price: 149,
  },
  {
    title: "Go (Golang) Programming & Backend Systems Course",
    subject: "Golang",
    description: "Master Go (Golang) from zero to production. Learn goroutines, channels, interfaces, Gin framework, concurrency, and high-performance microservices.",
    instructor: "Tech with Tim / FreeCodeCamp",
    youtubeUrl: "https://www.youtube.com/watch?v=YS4e4q9oBaU",
    youtubeEmbedId: "YS4e4q9oBaU",
    duration: "6.5 Hours",
    level: "Intermediate",
    thumbnail: "https://img.youtube.com/vi/YS4e4q9oBaU/hqdefault.jpg",
    tags: ["Golang", "Go", "Backend", "Concurrency", "Microservices"],
    rating: 4.9,
    viewsCount: 4600,
    isPremium: true,
    price: 149,
  },
  {
    title: "Python Programming Full Course for Beginners",
    subject: "Python",
    description: "Learn Python programming language fundamentals: OOP, data structures, functions, file handling, modules, and mini projects.",
    instructor: "FreeCodeCamp",
    youtubeUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw",
    youtubeEmbedId: "rfscVS0vtbw",
    duration: "4 Hours",
    level: "Beginner",
    thumbnail: "https://img.youtube.com/vi/rfscVS0vtbw/hqdefault.jpg",
    tags: ["Python", "OOP", "Scripting", "Data Structures"],
    rating: 4.8,
    viewsCount: 4900,
    isPremium: false,
    price: 0,
  },
  {
    title: "Data Structures & Algorithms (DSA) Roadmap & Course",
    subject: "DSA",
    description: "Master Data Structures & Algorithms: Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Sorting, Binary Search, and Dynamic Programming.",
    instructor: "Love Babbar / Tech Prep",
    youtubeUrl: "https://www.youtube.com/watch?v=VTLCoHnyACE",
    youtubeEmbedId: "VTLCoHnyACE",
    duration: "12 Hours",
    level: "Advanced",
    thumbnail: "https://img.youtube.com/vi/VTLCoHnyACE/hqdefault.jpg",
    tags: ["DSA", "Algorithms", "Data Structures", "Problem Solving", "C++"],
    rating: 4.9,
    viewsCount: 7500,
    isPremium: false,
    price: 0,
  },
  {
    title: "MongoDB Database Masterclass - NoSQL Complete Guide",
    subject: "MongoDB",
    description: "Learn MongoDB NoSQL database: CRUD operations, indexing, aggregation pipelines, schema design, and Mongoose ORM integration.",
    instructor: "Academind",
    youtubeUrl: "https://www.youtube.com/watch?v=c2M-rlkkT5o",
    youtubeEmbedId: "c2M-rlkkT5o",
    duration: "3 Hours",
    level: "Intermediate",
    thumbnail: "https://img.youtube.com/vi/c2M-rlkkT5o/hqdefault.jpg",
    tags: ["MongoDB", "NoSQL", "Database", "Mongoose", "Backend"],
    rating: 4.7,
    viewsCount: 2800,
    isPremium: false,
    price: 0,
  },
  {
    title: "Git & GitHub Complete Tutorial for Beginners",
    subject: "Git",
    description: "Learn version control with Git & GitHub. Master git init, commit, push, pull, branching, merge conflicts, pull requests, and open source.",
    instructor: "Kunal Kushwaha",
    youtubeUrl: "https://www.youtube.com/watch?v=apGV9Kg7ics",
    youtubeEmbedId: "apGV9Kg7ics",
    duration: "2.5 Hours",
    level: "Beginner",
    thumbnail: "https://img.youtube.com/vi/apGV9Kg7ics/hqdefault.jpg",
    tags: ["Git", "GitHub", "Version Control", "DevOps"],
    rating: 4.9,
    viewsCount: 3900,
    isPremium: false,
    price: 0,
  },
];

// @desc    Get all courses (with subject & search filter)
// @route   GET /api/courses
// @access  Private
const getAllCourses = asyncHandler(async (req, res) => {
  const { search, subject, level } = req.query;

  // Auto-seed or update Spring Boot & Golang if missing
  const count = await Course.countDocuments();
  if (count === 0) {
    await Course.insertMany(sampleCourses);
  } else {
    // Ensure Spring Boot and Golang premium courses exist
    for (const sc of sampleCourses) {
      const exists = await Course.findOne({ subject: sc.subject });
      if (!exists) {
        await Course.create(sc);
      }
    }
  }

  let query = { isActive: true };

  // Filter by subject
  if (subject && subject.toLowerCase() !== "all") {
    query.subject = { $regex: new RegExp(`^${subject}$`, "i") };
  }

  // Filter by level
  if (level && level.toLowerCase() !== "all") {
    query.level = level;
  }

  // Search by keyword in title, subject, or description
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  const courses = await Course.find(query).sort({ isPremium: -1, rating: -1, createdAt: -1 });

  res.json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course || !course.isActive) {
    res.status(404);
    throw new Error("Course not found");
  }

  res.json({
    success: true,
    data: course,
  });
});

// @desc    Create a new course (Admin/API)
// @route   POST /api/courses
// @access  Private
const createCourse = asyncHandler(async (req, res) => {
  const { title, subject, description, instructor, youtubeUrl, youtubeEmbedId, duration, level, tags, isPremium, price } = req.body;

  let tagsList = tags;
  if (typeof tagsList === "string") {
    tagsList = tagsList.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const course = await Course.create({
    title,
    subject,
    description,
    instructor,
    youtubeUrl,
    youtubeEmbedId,
    duration,
    level,
    tags: tagsList || [],
    isPremium: isPremium || false,
    price: price || 0,
    thumbnail: `https://img.youtube.com/vi/${youtubeEmbedId}/hqdefault.jpg`,
  });

  res.status(201).json({
    success: true,
    data: course,
  });
});

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
};
