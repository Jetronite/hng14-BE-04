export const requireApiVersion = (req, res, next) => {
  const version = req.header("X-API-Version");

  if (!version) {
    return res.status(400).json({
      status: "error",
      message: "API version header required"
    });
  }

  if (version !== "1") {
    return res.status(400).json({
      status: "error",
      message: "Invalid API version"
    });
  }

  next();
};