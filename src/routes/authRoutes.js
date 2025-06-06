const express = require("express");
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.get("/verifyemail/:verificationtoken", verifyEmail);
router.post("/resendverification", resendVerificationEmail);

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:resettoken", resetPassword);

router.put("/change-password", protect, changePassword);
router.get("/me", protect, getMe);

module.exports = router;
