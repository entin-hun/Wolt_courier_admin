import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Scheduler from "./services/Scheduler.js";
import { logger } from "./utils/logger.js";
import apiRoutes from "./routes/api.js";

// Load environment variables
dotenv.config();
// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;
// Middleware
app.use(cors());
app.use(express.json());
// API routes
app.use("/api", apiRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info(`Connected to MongoDB: ${process.env.MONGODB_URI}`);

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);

      // Start the scheduler
      Scheduler.start();

      // Run an immediate data collection if needed
      if (process.env.RUN_IMMEDIATE_COLLECTION === "true") {
        logger.info("Running immediate data collection on startup");
        Scheduler.runNow(false);
      }
    });
  })
  .catch((error) => {
    logger.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});
