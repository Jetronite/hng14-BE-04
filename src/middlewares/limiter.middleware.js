import rateLimit from "express-rate-limit";

// STRICT for Auth (Brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, 
  message: { status: "error", message: "Too many login attempts. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// PER-USER for API
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  keyGenerator: (req) => {
    // If the user is logged in, limit by their ID. 
    // Otherwise, fall back to their IP address.
    return req.user?.userId || req.ip; 
  },
  message: { status: "error", message: "Daily/Minute quota exceeded." },
  standardHeaders: true,
  legacyHeaders: false,
});