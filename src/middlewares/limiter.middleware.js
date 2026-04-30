import rateLimit from "express-rate-limit";

// STRICT for Auth (Brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10, // Use 'limit' instead of 'max' (v7+ syntax)
  message: { status: "error", message: "Too many login attempts. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false }, // Disables the strict IP/IPv6 warning
});

// PER-USER for API
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 60, // Use 'limit' instead of 'max'
  keyGenerator: (req) => {
    // Stage 3 logic: Limit by User ID if available, else IP
    return req.user?.id || rateLimit.ipKeyGenerator(req.ip);
  },
  message: { status: "error", message: "API quota exceeded. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});