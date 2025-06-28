export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  collectCoverageFrom: [
    "server.js",
    "services/**/*.js",
    "middleware/**/*.js",
    "database.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};
