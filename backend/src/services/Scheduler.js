import cron from "node-cron";
import WoltDataCollector from "./WoltDataCollector.js";
import CourierTracking from "./CourierTracking.js";
import { logger } from "../utils/logger.js";

class Scheduler {
  constructor() {
    // Schedule for first run of the day at 6 AM
    this.morningSchedule = "0 6 * * *";
    // Schedule for continuous runs every 29 minutes between 6 AM and 11 PM
    this.continuousSchedule = "*/28 6-22 * * *";
    this.trackingSchedule = "*/2 * * * *";
    // Flag to control tracking execution
    this.isCollectingData = false;

    // Track the jobs to be able to stop them during shutdown
    this.trackingJob = null;
    this.morningJob = null;
    this.continuousJob = null;
  }

  start() {
    logger.info("Starting Wolt data collection scheduler");

    // Schedule first run of the day (6 AM)
    this.morningJob = cron.schedule(this.morningSchedule, async () => {
      logger.info("Running morning data collection (first run of the day)");
      await this.runCollectionWithTracking(true);
    });

    // Schedule continuous runs every 29 minutes between 6 AM and 11 PM
    this.continuousJob = cron.schedule(this.continuousSchedule, async () => {
      const hour = new Date().getHours();
      // Skip the 6 AM run since it's handled by the morning schedule
      if (hour === 6 && new Date().getMinutes() === 0) {
        return;
      }
      logger.info("Running continuous data collection");
      await this.runCollectionWithTracking(false);
    });

    // Initialize tracking job (runs every 2 minutes)
    this.trackingJob = cron.schedule(this.trackingSchedule, async () => {
      if (!this.isCollectingData) {
        try {
          logger.info("Running idle courier tracking");
          await CourierTracking.trackIdleCouriers();
        } catch (error) {
          logger.error(`Error during courier tracking: ${error.message}`);
        }
      } else {
        logger.info("Skipping tracking job as data collection is in progress");
      }
    });

    logger.info("Scheduler started successfully");
  }

  // Helper method to run data collection with proper tracking control
  async runCollectionWithTracking(isFirstRun = false) {
    // Disable tracking during data collection
    this.isCollectingData = true;

    try {
      await this.runDataCollection(isFirstRun);
    } finally {
      // Re-enable tracking after collection completes (even if there was an error)
      this.isCollectingData = false;
      logger.info("Data collection completed, tracking enabled");
    }
  }

  // Run an immediate data collection
  async runNow(isFirstRun = false) {
    await this.runCollectionWithTracking(isFirstRun);
  }

  // Centralized method to handle data collection
  async runDataCollection(isFirstRun = false) {
    try {
      logger.info(`Running data collection (isFirstRun: ${isFirstRun})`);
      // Execute data collection
      await WoltDataCollector.collectData(isFirstRun);
    } catch (error) {
      logger.error(`Error during data collection: ${error.message}`);
    }
  }

  // Method to stop all jobs (useful for graceful shutdown)
  stop() {
    if (this.trackingJob) {
      this.trackingJob.stop();
    }
    if (this.morningJob) {
      this.morningJob.stop();
    }
    if (this.continuousJob) {
      this.continuousJob.stop();
    }
    logger.info("Scheduler stopped");
  }
}

export default new Scheduler();
