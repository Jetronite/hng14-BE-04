export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // We listen for the "finish" event so we can capture the status code 
  // after the controller has processed the request.
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || "anonymous",
      ip: req.ip
    };

    // In production, you'd send this to a tool like Datadog or ELK.
    // For now, structured JSON in the console is perfect.
    console.log(JSON.stringify(logData));
  });

  next();
};