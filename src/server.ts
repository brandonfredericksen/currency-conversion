import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import { getPort } from "./config/environment.js";
import { initializeDatabase } from "./database.js";
import { authenticateUser } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.js";
import { convertRoute } from "./routes/2025-06/convert.js";

const app = express();
const PORT = getPort();

app.use(helmet());
app.use(cors());
app.use(express.json());

initializeDatabase();

app.get(
  "/api/2025-06/convert",
  authenticateUser,
  rateLimitMiddleware,
  requestLoggerMiddleware,
  convertRoute
);

app.get("/health", (_: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Currency conversion service running on port ${PORT}`);
});

export default app;