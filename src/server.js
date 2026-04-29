import app from "./app.js";

app.use((req, res, next) => {
  console.log("🌍 EXPRESS RECEIVED:", req.method, req.url);
  next();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});