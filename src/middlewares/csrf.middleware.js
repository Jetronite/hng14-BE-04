export const requireCsrf = (req, res, next) => {
  // Only enforce CSRF on state-changing browser requests where cookies are present.
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const hasCookieAuth = Boolean(req.cookies?.access_token || req.cookies?.refresh_token);
  if (!hasCookieAuth) {
    return next();
  }

  const csrfCookie = req.cookies.csrf_token;
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ status: "error", message: "Invalid CSRF token" });
  }

  next();
};
