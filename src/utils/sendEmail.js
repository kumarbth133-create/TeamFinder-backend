const nodemailer = require("nodemailer");

/**
 * Creates and returns a nodemailer transporter instance
 */
const createTransporter = async () => {
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const emailService = process.env.EMAIL_SERVICE || process.env.SMTP_SERVICE;

  // 1. If explicit Gmail or popular service is specified
  if (emailUser && emailPass && (emailService === "gmail" || (!process.env.SMTP_HOST && emailUser.includes("@gmail.com")))) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  // 2. If custom SMTP config is provided (e.g. Mailtrap, SendGrid, Hostinger, custom SMTP)
  if (process.env.SMTP_HOST && emailUser && emailPass) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  // 3. Fallback in dev/test: Use Ethereal test account or local mock
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    console.warn("⚠️ Could not create Ethereal test account:", err.message);
    return null;
  }
};

/**
 * Send email helper via Nodemailer
 * @param {Object} options - { to, subject, html, text, replyTo }
 */
const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  const fromName = process.env.FROM_NAME || "TeamUp Mentorship Finder";
  const fromEmail =
    process.env.FROM_EMAIL ||
    process.env.EMAIL_USER ||
    "teamup2026@gmail.com";

  try {
    const transporter = await createTransporter();

    if (!transporter) {
      console.log(`\n================= [SIMULATED EMAIL TO ${to}] =================`);
      console.log(`From: "${fromName}" <${fromEmail}>`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content:\n${text || "HTML Email Content"}`);
      console.log(`==============================================================\n`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: text || "You have a new mentorship guidance request on TeamUp.",
      html,
    };

    if (replyTo) {
      mailOptions.replyTo = replyTo;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`\n=============================================================`);
    console.log(`✉️ EMAIL DISPATCHED TO MENTOR: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message ID: ${info.messageId}`);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Ethereal Web Preview: ${previewUrl}`);
    }
    console.log(`=============================================================\n`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (error) {
    console.error("❌ Nodemailer delivery error:", error.message);
    if (error.message && error.message.includes("535")) {
      console.error("\n⚠️ [GMAIL SETUP REQUIRED]: Google does not accept your regular Gmail password.");
      console.error("👉 Please generate a 16-digit App Password here: https://myaccount.google.com/apppasswords");
      console.error("👉 And put it in backend/.env -> EMAIL_PASS=your_16_digit_app_password\n");
    }
    return { success: false, error: error.message };
  }
};

/**
 * Build clean email links without exposing raw URLs in text
 */
const buildDirectEmailLinks = ({
  mentorEmail,
  mentorName,
  studentName,
  studentEmail,
  topic,
  message,
  actionToken,
  clientUrl = process.env.CLIENT_URL || "https://team-finder-backend.vercel.app",
}) => {
  const acceptUrl = `${clientUrl}/mentor-request/action?token=${actionToken}&action=accept`;
  const rejectUrl = `${clientUrl}/mentor-request/action?token=${actionToken}&action=reject`;

  const subject = `🚀 Mentorship Guidance Request: ${studentName} for "${topic}"`;

  const portalUrl = `${clientUrl}/mentor-request/action?token=${actionToken}`;

  const plainTextBody = `Hello ${mentorName},

I am ${studentName} (${studentEmail}), reaching out on TeamUp for your mentorship guidance.

📌 Guidance Topic:
${topic}

💬 My Message:
"${message}"

--------------------------------------------------
👉 View & Respond to this Request (Accept / Reject):
${portalUrl}

Thank you!
Sent via TeamUp Mentorship Platform`;

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(plainTextBody);

  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    mentorEmail
  )}&su=${encodedSubject}&body=${encodedBody}`;

  const mailtoUrl = `mailto:${encodeURIComponent(
    mentorEmail
  )}?subject=${encodedSubject}&body=${encodedBody}`;

  return {
    subject,
    plainTextBody,
    portalUrl,
    acceptUrl,
    rejectUrl,
    gmailComposeUrl,
    mailtoUrl,
  };
};

/**
 * Generate rich responsive HTML email with styled Accept and Reject buttons directly under the message
 */
const generateMentorRequestEmail = ({
  mentorName,
  mentorEmail,
  studentName,
  studentEmail,
  studentCollege,
  studentSkills,
  topic,
  message,
  actionToken,
  clientUrl = process.env.CLIENT_URL || "https://team-finder-backend.vercel.app",
}) => {
  const acceptUrl = `${clientUrl}/mentor-request/action?token=${actionToken}&action=accept`;
  const rejectUrl = `${clientUrl}/mentor-request/action?token=${actionToken}&action=reject`;
  const studentSkillsFormatted =
    Array.isArray(studentSkills) && studentSkills.length > 0
      ? studentSkills.join(", ")
      : "Full Stack Development, Web Tech";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Mentorship Guidance Request</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 20px auto;
      background: #1e293b;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #334155;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #990012 0%, #ca0019 50%, #e6001c 100%);
      padding: 30px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.92;
    }
    .content {
      padding: 28px 24px;
    }
    .mentor-greeting {
      font-size: 17px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 14px;
    }
    .info-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 20px;
    }
    .info-row {
      margin-bottom: 12px;
      font-size: 14px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 2px;
    }
    .value {
      color: #f1f5f9;
      font-weight: 500;
    }
    .message-box {
      background: #1e293b;
      border-left: 4px solid #e6001c;
      padding: 14px 16px;
      border-radius: 8px;
      font-style: normal;
      color: #f1f5f9;
      font-size: 14px;
      margin-top: 6px;
      line-height: 1.6;
    }
    .action-container {
      text-align: center;
      padding: 18px 16px;
      margin-top: 20px;
      background: #0f172a;
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .action-title {
      font-size: 13px;
      font-weight: 700;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }
    .btn {
      display: inline-block;
      padding: 12px 28px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      border-radius: 8px;
      margin: 6px 8px;
      transition: all 0.2s ease;
    }
    .btn-accept {
      background-color: #10b981;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
    }
    .btn-reject {
      background-color: #ef4444;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
    }
    .footer {
      background: #0f172a;
      padding: 18px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #1e293b;
    }
    .footer a {
      color: #e6001c;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .wrapper {
        width: 100% !important;
        margin: 10px auto !important;
        border-radius: 12px !important;
      }
      .header {
        padding: 20px 16px !important;
      }
      .header h1 {
        font-size: 20px !important;
      }
      .content {
        padding: 20px 16px !important;
      }
      .btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 8px 0 !important;
        text-align: center !important;
        padding: 14px 16px !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🚀 TeamUp Mentorship</h1>
      <p>Student Guidance & Project Collaboration</p>
    </div>

    <div class="content">
      <div class="mentor-greeting">Hello ${mentorName},</div>
      <p style="margin-top:0; color:#cbd5e1; font-size:14px;">
        A student on <strong>TeamUp</strong> has submitted a mentorship and guidance request to you.
      </p>

      <div class="info-card">
        <div class="info-row">
          <span class="label">Student Name</span>
          <span class="value" style="font-size:15px; font-weight:700; color:#ffffff;">${studentName}</span>
        </div>
        <div class="info-row">
          <span class="label">Student Email Address</span>
          <span class="value"><a href="mailto:${studentEmail}" style="color:#38bdf8; text-decoration:none; font-weight:600;">${studentEmail}</a></span>
        </div>
        ${
          studentCollege
            ? `<div class="info-row"><span class="label">College / Institute</span><span class="value">${studentCollege}</span></div>`
            : ""
        }
        <div class="info-row">
          <span class="label">Student Skills</span>
          <span class="value">${studentSkillsFormatted}</span>
        </div>
        <div class="info-row" style="margin-top:14px;">
          <span class="label">Guidance Topic / Subject</span>
          <span class="value" style="font-weight:700; color:#f8fafc; font-size:15px;">${topic}</span>
        </div>
        <div class="info-row" style="margin-top:12px;">
          <span class="label">Student Message / Request Details</span>
          <div class="message-box">${message}</div>
        </div>

        <!-- 2 Clean Response Buttons Right Below The Message -->
        <div class="action-container">
          <div class="action-title">Respond to this Request</div>
          <div>
            <a href="${acceptUrl}" class="btn btn-accept" target="_blank">
              ✅ Accept Request
            </a>
            <a href="${rejectUrl}" class="btn btn-reject" target="_blank">
              ❌ Reject Request
            </a>
          </div>
          <p style="font-size:12px; color:#94a3b8; margin:10px 0 0 0;">
            Clicking <strong>"Accept"</strong> will immediately notify the student in their TeamUp notification center!
          </p>
        </div>
      </div>
    </div>

    <div class="footer">
      <p style="margin:0 0 6px 0;">This email was sent directly to <strong>${mentorEmail}</strong> via TeamUp.</p>
      <p style="margin:0;">TeamUp Platform • Project & Mentorship Finder</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = {
  sendEmail,
  generateMentorRequestEmail,
  buildDirectEmailLinks,
};
