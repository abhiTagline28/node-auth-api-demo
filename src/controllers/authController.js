const User = require("../models/User");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();

exports.signup = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      // return res.status(400).json({
      //   success: false,
      //   message: "User already exist with this email",
      // });

      if (user.isVerified) {
        return res
          .status(400)
          .json({ success: false, message: "User already exists" });
      } else {
        await User.deleteOne({ email: user.email });
      }
    }

    user = new User({ name, email, password });

    const verificationToken = user.getEmailVerificationToken();
    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verifyemail/${verificationToken}`;
    const message = `
      Thank you for registering! Please verify your email address by clicking the link below:
      \n\n${verificationUrl}\n\n
      If you did not create an account, please ignore this email. This link will expire in 1 hour.
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Email Verification - Your App",
        message,
      });
      res.status(201).json({
        success: true,
        message:
          "Registration successful. Please check your email to verify your account.",
      });
    } catch (error) {
      console.log("Email sending error on signup: ", err);
      await User.findByIdAndDelete(user._id);
      return res
        .status(500)
        .json({ success: false, message: "Error sending verification email." });
    }

    // user = await User.create({
    //   name,
    //   email,
    //   password,
    // });

    // sendTokenResponse(user, 201, res, "User registered successfully");
  } catch (error) {
    console.log("Signup error", error);
    res.status(500).json({
      success: false,
      message: "Server error during signup",
      error: error.message,
    });
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const emailVerificationToken = crypto
      .createHash("sha256")
      .update(req.params.verificationtoken)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified. You can login.",
      });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Email verified successfully." });
  } catch (error) {
    console.log("Email verification error: ", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
      error: error.message,
    });
  }
};

exports.resendVerificationEmail = async (req, res, next) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide an email address" });
    }
    const user = await User.findOne({ email });
    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "This account is already verified." });
    }
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.CLIENT_URL}/verifyemail/${verificationToken}`;
    const message = `
            Please verify your email address by clicking the link below:
            \n\n${verificationUrl}\n\n
            If you did not request this, please ignore this email. This link will expire in 1 hour.
        `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Resend Email Verification - Your App Name",
        message,
      });
      res.status(200).json({
        success: true,
        message: "Verification email resent. Please check your inbox.",
      });
    } catch (err) {
      console.error("Email Sending Error on Resend:", err);
      // Reset token fields if email fails, so they don't have a dangling unusable token.
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        message: "Error resending verification email.",
      });
    }
  } catch (error) {
    console.error("Resend Verification Email Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error during resend verification",
      error: error.message,
    });
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: "false",
        message: "Please provide email and password ",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials (User not found)",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message:
          "Email not verified. Please check your inbox for a verification link.",
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials (User not found)",
      });
    }

    sendTokenResponse(user, 200, res, "Login successful");
  } catch (error) {
    console.log("Login error : ", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "please provide email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "No user found with this email" });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account not verified. Please verify your email first.",
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a put request to: \n\n ${resetUrl} \n\nIf you did not request this, please ignore this email and your password will remail unchanged. this token is valid for 10 minutes.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Token",
        message,
      });
      res.status(200).json({
        success: true,
        message: "Email sent with password reset instructions.",
      });
    } catch (error) {
      console.log("Email Sending error: ", error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });
      return res
        .status(500)
        .json({ success: false, message: "Email could not be sent" });
    }
  } catch (error) {
    console.log("Error during forgot password ", error);
    res.status(500).json({
      success: false,
      message: "Server error during forgot password",
      error: error.message,
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  const { password } = req.body;
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account not verified. Cannot reset password.",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new password with at least 6 characters.",
      });
    }

    user.password = password;
    user.resetPasswordExpire = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendTokenResponse(
      user,
      200,
      res,
      "Password reset successful. You can now login"
    );
  } catch (error) {
    console.log("Reset Password error", error);
    res.status(500).json({
      success: false,
      message: "Error during reset password",
      error: error.message,
    });
  }
};

exports.changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide old and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the old password.",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await user.matchPassword(oldPassword);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect old password" });
    }

    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.log("Change password error: ", error);
    res
      .status(500)
      .json({ success: false, message: "Error during change password" });
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "user not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("Get me Error: ", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const sendTokenResponse = (user, statusCode, res, message) => {
  const token = user.getSignedJwtToken();
  const options = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRE_DAYS || "30", 10) *
          24 *
          60 *
          60 *
          1000 // Default to 30 days
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
};
