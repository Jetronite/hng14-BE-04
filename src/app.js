import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import profileRoutes from "./routes/profileRoutes.js";
import { requireApiVersion } from "./middlewares/requireApiVersion.js";
import { authLimiter, apiLimiter } from "./middlewares/limiter.middleware.js";
import { requestLogger } from "./middlewares/logger.middleware.js";
import authRoutes from './routes/authRoutes.js';
import cookieParser from "cookie-parser";
import { authenticate } from "./middlewares/auth.middleware.js";

dotenv.config();

const app = express();

// 1. Global Middleware (Always first)
app.use(express.json());
app.use(requestLogger); // Custom logger to capture request details and response status
app.use(cookieParser()); // For parsing cookies, needed for refresh token handling


// 2. CORS (Set this before routes)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});


// 3. Public Routes (No authentication needed)
// These MUST come before the app.use("/api", authenticate) line
app.use('/auth', authLimiter, authRoutes); 

// 4. API Versioning (Apply to all /api routes)
app.use("/api", requireApiVersion);

// 5. Protected Routes Setup
// Option A: Apply globally to /api
app.use("/api", authenticate); 
app.use("/api/profiles", authenticate, apiLimiter, profileRoutes); // Apply auth and rate limiting to profile routes

// // Option B (Recommended): Apply specifically to the routes that need it
// // This prevents "locking out" future public API endpoints
// app.use("/api/profile", authenticate, profileRoutes);


// DB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

export default app;