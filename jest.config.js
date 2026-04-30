export default {
  testEnvironment: "node",
  transform: {}, // Tells Jest not to use Babel if you're using native ESM
  verbose: true, // Shows detailed output for each test
  testMatch: [
    "**/tests/**/*.test.js",
    "**/tests/**/*.spec.js"
  ],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/*.spec.js"
  ],
  setupFilesAfterEnv: [],
  testTimeout: 30000, // 30 seconds for async tests
  forceExit: true, // Exit after tests complete
  detectOpenHandles: true // Detect handles that prevent Jest from exiting
};