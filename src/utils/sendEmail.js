const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail", // Allow service override or default to gmail
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // For manual configuration if not using a known service:
    // host: process.env.EMAIL_HOST,
    // port: parseInt(process.env.EMAIL_PORT, 10),
    // secure: parseInt(process.env.EMAIL_PORT, 10) === 465, // true if port is 465 (SSL)
  });

  const mailOptions = {
    from:
      process.env.EMAIL_FROM || `"Your App Name" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html, // Allow HTML emails
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    // Throw an error to be caught by the calling function
    throw new Error(
      "Email could not be sent. Please try again later or check server logs."
    );
  }
};

module.exports = sendEmail;
