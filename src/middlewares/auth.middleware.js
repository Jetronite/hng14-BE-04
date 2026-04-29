import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

export const authenticate = async (req, res, next) => {
  console.log("🔥 AUTH MIDDLEWARE HIT");
  try {
    // 1. Check Cookies FIRST, then fall back to Headers
    let token = req.cookies?.access_token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. If still no token, THEN fail
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired access token"
      });
    }
    // Fetch user
    const user = await User.findOne({ id: decoded.userId });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User not found"
      });
    }

    // 🔥 IMPORTANT: inactive user check
    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "Account is inactive"
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role,
      username: user.username,
      avatar_url: user.avatar_url
    };

    next();

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
};


export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: "error",
          message: "Unauthorized"
        });
      }
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          status: "error",
          message: "Forbidden: insufficient permissions"
        });
      }

      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: "error",
        message: "Server error"
      });
    }
  };
};