const asyncHandler = require("express-async-handler");
const Project = require("../models/Project");
const User = require("../models/User");

// @desc    Process AI chat message for project-related guidance
// @route   POST /api/ai/chat
// @access  Private
const chatWithAI = asyncHandler(async (req, res) => {
  const { message, conversationHistory = [], currentProjectId = null } = req.body;
  const user = req.user;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please provide a question or message for the AI agent.",
    });
  }

  const query = message.trim();
  const lowerQuery = query.toLowerCase();

  // Fetch active projects and current context from database
  let activeProjects = [];
  let currentProject = null;
  try {
    activeProjects = await Project.find({ isActive: true, status: "open" })
      .populate("owner", "name email department semester")
      .populate("teamMembers", "name email department")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (currentProjectId) {
      currentProject = await Project.findById(currentProjectId)
        .populate("owner", "name email department semester")
        .populate("teamMembers", "name email department")
        .lean();
    }
  } catch (err) {
    console.error("Error fetching database context for AI:", err.message);
  }

  // 1. If external GEMINI_API_KEY or GROQ_API_KEY or OPENAI_API_KEY is configured, use LLM with project RAG context
  if (process.env.GEMINI_API_KEY) {
    try {
      const responseText = await callGeminiAPI(process.env.GEMINI_API_KEY, query, conversationHistory, {
        user,
        activeProjects,
        currentProject,
      });
      if (responseText) {
        return res.status(200).json({
          success: true,
          data: {
            reply: responseText,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to built-in project intelligence engine:", err.message);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const responseText = await callGroqAPI(process.env.GROQ_API_KEY, query, conversationHistory, {
        user,
        activeProjects,
        currentProject,
      });
      if (responseText) {
        return res.status(200).json({
          success: true,
          data: {
            reply: responseText,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      console.warn("Groq API call failed, falling back to built-in project intelligence engine:", err.message);
    }
  }

  // 2. Intelligent Built-in Project AI Intelligence Engine
  const aiReply = generateIntelligentProjectResponse(query, lowerQuery, {
    user,
    activeProjects,
    currentProject,
  });

  return res.status(200).json({
    success: true,
    data: {
      reply: aiReply,
      timestamp: new Date().toISOString(),
    },
  });
});

// @desc    Get dynamic AI prompt suggestions
// @route   GET /api/ai/suggestions
// @access  Private
const getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = [
    { icon: "💡", label: "Suggest a trending AI / MERN project idea", prompt: "Suggest a modern full-stack project idea with AI integration, architecture breakdown, and required skills." },
    { icon: "👥", label: "Find open projects matching my skills", prompt: "Which open projects currently on TeamUp match my profile and skills?" },
    { icon: "🛠️", label: "Recommend best tech stack", prompt: "What is the recommended tech stack and database for building a scalable team collaboration platform?" },
    { icon: "📋", label: "Generate 4-Week Project Roadmap", prompt: "Create a 4-week step-by-step sprint roadmap for building a web application with a 4-person team." },
    { icon: "🚀", label: "Tips for attracting great teammates", prompt: "How can I write a high-impact project description on TeamUp that attracts skilled student developers?" },
  ];

  res.status(200).json({
    success: true,
    data: suggestions,
  });
});

/**
 * Built-in Intelligent Project Intelligence Engine
 */
function generateIntelligentProjectResponse(query, lowerQuery, context) {
  const { user, activeProjects, currentProject } = context;
  const userName = user?.name ? user.name.split(" ")[0] : "Student";
  const userSkills = Array.isArray(user?.skills) ? user.skills : [];

  // Current project specific inquiries
  if (currentProject && (lowerQuery.includes("this project") || lowerQuery.includes("current project") || lowerQuery.includes("explain project"))) {
    const skillsList = currentProject.skillsRequired?.join(", ") || "General development";
    const openSlots = (currentProject.maxMembers || 5) - (currentProject.teamMembers?.length || 0);
    return `### 📌 Overview for **${currentProject.title}**

- **Project Lead:** ${currentProject.owner?.name || "Team Lead"} (${currentProject.owner?.department || "Student"})
- **Required Skills:** \`${skillsList}\`
- **Team Size:** ${currentProject.teamMembers?.length || 0}/${currentProject.maxMembers || 5} members (${openSlots > 0 ? `🟢 ${openSlots} open slots available` : "🔴 Team Full"})
- **Status:** **${currentProject.status.toUpperCase()}**

**Description:**
${currentProject.description}

💡 **AI Recommendation for this project:**
1. **Architecture:** Ensure a clean separation between API routes and client state.
2. **Collaboration:** Use GitHub Projects / Kanban board for assigning milestone tasks to each team member.
3. **Communication:** Create a dedicated Discord or Slack channel for daily standups!`;
  }

  // 1. Search / Match Projects on TeamUp
  if (
    lowerQuery.includes("find project") ||
    lowerQuery.includes("matching") ||
    lowerQuery.includes("open project") ||
    lowerQuery.includes("available project") ||
    (lowerQuery.includes("skills") && lowerQuery.includes("project"))
  ) {
    if (!activeProjects || activeProjects.length === 0) {
      return `Hey **${userName}**! 👋 Currently there are no open public projects listed in the database.

✨ **Next Step:** You can be the first to create one! Click on **Create Project** in the sidebar to publish your idea, define the required skills (like React, Node.js, Python), and invite fellow students to join.`;
    }

    // Match with user skills if available
    let matched = [];
    if (userSkills.length > 0) {
      matched = activeProjects.filter((p) =>
        p.skillsRequired?.some((skill) =>
          userSkills.some((us) => us.toLowerCase() === skill.toLowerCase())
        )
      );
    }

    const projectsToShow = matched.length > 0 ? matched : activeProjects.slice(0, 4);

    let reply = `Hey **${userName}**! 🎯 Here are the top active projects on **TeamUp**:\n\n`;
    projectsToShow.forEach((p, idx) => {
      const skills = p.skillsRequired?.map((s) => `\`${s}\``).join(" ") || "`General`";
      const openSlots = (p.maxMembers || 5) - (p.teamMembers?.length || 0);
      reply += `${idx + 1}. **${p.title}**\n`;
      reply += `   - 👤 **Owner:** ${p.owner?.name || "Student"}\n`;
      reply += `   - 🛠️ **Required Skills:** ${skills}\n`;
      reply += `   - 👥 **Team Slots:** ${p.teamMembers?.length || 0}/${p.maxMembers || 5} (${openSlots > 0 ? `${openSlots} open` : "Full"})\n`;
      reply += `   - 📝 *${p.description.length > 90 ? p.description.slice(0, 90) + "..." : p.description}*\n\n`;
    });

    reply += `👉 You can browse all projects on the **Browse Projects** page and submit a **Join Request** directly!`;
    return reply;
  }

  // 2. Project Idea Generation
  if (
    lowerQuery.includes("idea") ||
    lowerQuery.includes("suggest project") ||
    lowerQuery.includes("brainstorm") ||
    lowerQuery.includes("what should i build")
  ) {
    if (lowerQuery.includes("ai") || lowerQuery.includes("ml") || lowerQuery.includes("machine learning")) {
      return `### 💡 AI & Machine Learning Project Ideas:

1. **Smart Resume & Skill Matcher for College Placements**
   - **Tech Stack:** FastAPI, Python, LangChain / OpenAI, React, TailwindCSS, MongoDB.
   - **Key Features:** Automated resume parsing, skill gap analysis, personalized roadmap suggestions.
   - **Team Roles:** 1 ML Engineer (NLP), 1 Backend Dev, 1 Frontend Dev.

2. **Real-time Code Review & Bug Explainer Bot**
   - **Tech Stack:** Next.js, Node.js, Claude/Gemini API, Docker for sandboxing.
   - **Key Features:** Syntax error diagnosis, time complexity estimation, security vulnerability scan.

3. **Campus Voice & Multilingual Academic Assistant**
   - **Tech Stack:** Whisper AI, Express.js, React Native or React, ChromaDB (Vector Search).
   - **Key Features:** Converts lecture audio to structured flashcards and quiz questions.

🚀 *Tip: You can create a project on TeamUp with one of these titles to find collaborators!*`;
    }

    return `### 💡 High-Impact Full-Stack Project Ideas for Your Team:

1. **Team & Hackathon Workspace (Real-Time Collab)**
   - **Tech Stack:** React, TailwindCSS, Node.js/Express, Socket.io, MongoDB.
   - **Features:** Real-time canvas whiteboard, milestone task board, audio/video peer rooms.

2. **Campus Event & Ticket Booking Marketplace**
   - **Tech Stack:** MERN Stack, Razorpay/Stripe Test API, QR Code ticketing scanner.
   - **Features:** Organizer dashboard, attendance check-in system, automated email tickets.

3. **Peer-to-Peer Student Notes & Project Marketplace**
   - **Tech Stack:** React, Tailwind, Cloudinary/AWS S3, Express, MongoDB.
   - **Features:** Upvoting system, verified semester toppers badge, doubt discussion forum.

Would you like me to generate a **4-week sprint roadmap** or **architecture breakdown** for any of these?`;
  }

  // 3. Tech Stack Recommendations
  if (
    lowerQuery.includes("tech stack") ||
    lowerQuery.includes("stack") ||
    lowerQuery.includes("technology") ||
    lowerQuery.includes("framework") ||
    lowerQuery.includes("database")
  ) {
    return `### 🛠️ Recommended Tech Stacks by Project Type:

#### 1. 🌐 Modern Full-Stack Web Application (Fast & Scalable)
- **Frontend:** React.js / Vite or Next.js + TailwindCSS + Lucide Icons.
- **Backend:** Node.js with Express.js (REST APIs) or NestJS for enterprise structure.
- **Database:** MongoDB (Flexible document store with Mongoose) or PostgreSQL (Relational with Prisma).
- **Authentication:** JWT (JSON Web Tokens) with HttpOnly cookies or bcrypt password hashing.

#### 2. ⚡ Real-Time & Interactive Apps (Chat / Games / Live Collab)
- **Frontend:** React + Zustand (State Management) + Tailwind.
- **Backend:** Node.js + **Socket.io** or WebSockets.
- **Cache/PubSub:** Redis for live sessions and message queues.

#### 3. 🤖 AI-Powered Applications
- **AI Backend:** Python (FastAPI) + LangChain / LlamaIndex + HuggingFace / Gemini API.
- **Vector DB:** Pinecone, ChromaDB, or pgvector.
- **Client:** React or Next.js with Server-Sent Events (SSE) for real-time streaming tokens.

💡 *Need guidance on setting up any specific library? Just ask!*`;
  }

  // 4. Project Roadmap / Sprint Plan
  if (
    lowerQuery.includes("roadmap") ||
    lowerQuery.includes("sprint") ||
    lowerQuery.includes("plan") ||
    lowerQuery.includes("tasks") ||
    lowerQuery.includes("timeline")
  ) {
    return `### 📋 4-Week Agile Sprint Roadmap for Student Projects:

| Week | Phase | Key Deliverables |
| :--- | :--- | :--- |
| **Week 1** | **Architecture & Design** | • Define DB schemas (User, Project, etc.)<br>• Figma wireframes & UI design system<br>• Setup Git repo, branch policies & boilerplate |
| **Week 2** | **Core Backend & Auth** | • JWT Authentication & protected middleware<br>• CRUD API endpoints for primary resources<br>• Postman collection verification |
| **Week 3** | **Frontend Integration** | • Responsive dashboard & forms with Tailwind<br>• API integration using Axios with error handling<br>• Toast notifications & loading skeletons |
| **Week 4** | **Testing & Deployment** | • Edge-case bug testing & responsive check<br>• Backend deploy (Render/Railway/Vercel)<br>• Frontend deploy (Vercel/Netlify) + Demo Video |

🎯 **Team Pro-Tip:** Hold a 15-minute sync twice a week to unblock team members!`;
  }

  // 5. Team Formation & Proposal Help
  if (
    lowerQuery.includes("team") ||
    lowerQuery.includes("proposal") ||
    lowerQuery.includes("how to") ||
    lowerQuery.includes("collaborate") ||
    lowerQuery.includes("member")
  ) {
    return `### 👥 How to Build a Winning Project Team on TeamUp:

1. **Craft a Clear Title & Problem Statement**
   - Bad: *"Need web dev for project"*
   - Good: *"Building an AI-Powered Smart Campus Navigation App (MERN + Leaflet)"*

2. **Specify Exact Roles & Skills Needed**
   - Clearly list requirements like: \`React\`, \`TailwindCSS\`, \`Node.js\`, \`Figma\`.
   - Set an ideal team cap (3 to 5 students is usually the sweet spot).

3. **Filter Join Requests Effectively**
   - Review applicant profiles, check their listed skills, GitHub links, and past projects.
   - Accept requests under **My Requests** tab in the sidebar.

4. **Kickoff the Collaboration**
   - Share a repository link, agree on coding conventions, and set target sprint deadlines!`;
  }

  // 6. Greetings & General Project Queries
  if (
    lowerQuery === "hi" ||
    lowerQuery === "hello" ||
    lowerQuery === "hey" ||
    lowerQuery.startsWith("hello") ||
    lowerQuery.startsWith("hi ")
  ) {
    return `Hello **${userName}**! 👋 I am your **TeamUp AI Project Copilot**.

I'm here to help you across your entire project journey:
- 💡 **Brainstorm unique project ideas**
- 🔍 **Find matching projects & teammates on TeamUp**
- 🛠️ **Recommend tech stacks & system architectures**
- 📋 **Generate project roadmaps & milestone tasks**
- 💻 **Debug code and explain technical concepts**

How can I assist your project today?`;
  }

  // Default intelligent technical assistant reply
  return `### 🤖 TeamUp AI Copilot Response

You asked: *"**${query}**"*

Here is my recommendation for your project:
1. **Scope & Objectives:** Keep your minimum viable product (MVP) focused on solving one clear problem for users before adding advanced features.
2. **Team Collaboration:** Make sure all team members have clear responsibilities (Frontend, Backend, UI/UX, or Testing) with established deadlines.
3. **Tech Stack & Integration:** Use standard REST or GraphQL APIs with clean error handling, environment variables (\`.env\`), and structured component design.
4. **TeamUp Platform:** You can create new projects, browse open opportunities on the **Browse Projects** page, or find mentors on **Find Mentors**.

Feel free to ask me for a **tech stack recommendation**, **step-by-step roadmap**, or **project ideas**!`;
}

/**
 * Optional Gemini API Integration
 */
async function callGeminiAPI(apiKey, prompt, conversationHistory, context) {
  const projectSummaries = (context.activeProjects || [])
    .map((p) => `- "${p.title}" by ${p.owner?.name || "Student"} (Skills: ${p.skillsRequired?.join(", ")})`)
    .join("\n");

  const systemInstruction = `You are "TeamUp AI", an expert Project Advisor and Coding Mentor for the TeamUp student collaboration platform.
Current Logged In User: ${context.user?.name || "Student"} (Skills: ${context.user?.skills?.join(", ") || "General"}).
Active Platform Projects:
${projectSummaries || "No active projects listed currently."}

Your goals:
- Answer student questions about building software projects, choosing tech stacks, forming teams, and debugging.
- Be concise, structured, friendly, and practical with markdown formatting, code snippets, and action steps.
- Refer to active projects on TeamUp when relevant.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = [];
  contents.push({
    role: "user",
    parts: [{ text: `${systemInstruction}\n\nUser Question: ${prompt}` }],
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

/**
 * Optional Groq API Integration
 */
async function callGroqAPI(apiKey, prompt, conversationHistory, context) {
  const projectSummaries = (context.activeProjects || [])
    .map((p) => `- "${p.title}" by ${p.owner?.name || "Student"} (Skills: ${p.skillsRequired?.join(", ")})`)
    .join("\n");

  const systemMessage = {
    role: "system",
    content: `You are "TeamUp AI", a friendly, highly skilled Project Copilot on TeamUp.
User: ${context.user?.name || "Student"}.
Current Active Projects on TeamUp:
${projectSummaries || "None currently."}
Provide actionable project advice, tech stacks, roadmaps, and code help in clean GitHub markdown.`,
  };

  const messages = [systemMessage, { role: "user", content: prompt }];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API returned status ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

module.exports = {
  chatWithAI,
  getSuggestions,
};
