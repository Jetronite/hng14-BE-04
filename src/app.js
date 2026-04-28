import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import profileRoutes from "./routes/profileRoutes.js";
import { requireApiVersion } from "./middlewares/requireApiVersion.js";
import authRoutes from './routes/authRoutes.js';
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use("/api", requireApiVersion);

// CORS (REQUIRED by spec)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use(cookieParser());

// Routes
app.use("/api", profileRoutes);

// Use the auth routes
app.use('/auth', authRoutes);

// DB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

export default app;