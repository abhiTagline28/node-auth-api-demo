const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");

dotenv.config();

connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

// app.use((err, req, res, next) => {
//   console.log("Globel error handler : ", err.stack);

//   res.stack(err.statusCode || 500).json({
//     success: false,
//     error: err.message || "Server error",
//   });
// });

const PORT = process.env.PORT || 500;

app.listen(
  PORT,
  console.log(
    `Server is running on Port : ${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode.`
  )
);
