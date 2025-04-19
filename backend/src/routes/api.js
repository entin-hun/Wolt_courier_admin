import express from "express";
import { startOfMonth, endOfDay, startOfDay } from "date-fns";
import CourierStats from "../models/CourierStats.js";
import Courier from "../models/Courier.js";
import Scheduler from "../services/Scheduler.js";
import { logger } from "../utils/logger.js";
const router = express.Router();

// Get all couriers
router.get("/couriers", async (req, res) => {
  try {
    const couriers = await Courier.find({ isDisabled: false }).sort({
      name: 1,
    });
    res.json(couriers);
  } catch (error) {
    logger.error("Error fetching couriers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/couriers/all-stats", async (req, res) => {
  try {
    // Fetch all courier stats
    const allCourierStats = await CourierStats.find().sort({ date: -1 }).lean();

    if (!allCourierStats.length) {
      return res.status(404).json({
        success: false,
        message: "No courier stats found",
      });
    }

    res.json({
      success: true,
      data: allCourierStats,
    });
  } catch (error) {
    logger.error("Error fetching all courier stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Trigger manual data collection
router.post("/collect", async (req, res) => {
  try {
    const { isFirstRun } = req.body;

    // Start data collection in the background
    Scheduler.runNow(isFirstRun === true);

    res.json({ message: "Data collection started" });
  } catch (error) {
    logger.error("Error triggering data collection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/courier/search", async (req, res) => {
  try {
    const { courierId } = req.query;
    if (!courierId) {
      return res.status(400).json({
        success: false,
        message: "Courier ID is required",
      });
    }

    // Find all stats for this courier
    const courierStats = await CourierStats.find({ courierId })
      .sort({ date: -1 }) // Sort by date descending
      .lean();

    if (!courierStats || courierStats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Courier stats not found",
      });
    }

    res.json({
      success: true,
      data: courierStats,
    });
  } catch (error) {
    logger.error("Error searching courier:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Function to calculate the start and end of a day in Unix milliseconds (UTC)
const getUTCDayRange = (timestamp) => {
  const startOfDay = Math.floor(timestamp / 86400000) * 86400000; // 00:00:00 UTC
  const endOfDay = startOfDay + 86399999; // 23:59:59 UTC
  return { startOfDay, endOfDay };
};

// Route to fetch filtered stats
router.get("/courier/filtered-stats", async (req, res) => {
  try {
    const { courierId, from, to } = req.query;
    if (!courierId || !from || !to) {
      return res
        .status(400)
        .json({ error: "courierId, from, and to timestamps are required" });
    }

    let fromTimestamp = parseInt(from);
    let toTimestamp = parseInt(to);
    let results = [];

    for (let ts = fromTimestamp; ts <= toTimestamp; ts += 86400000) {
      const { startOfDay, endOfDay } = getUTCDayRange(ts);

      let stats = await CourierStats.find({
        courierId,
        $or: [
          { date: { $gte: startOfDay, $lte: endOfDay } },
          { latestUpdate: { $gte: startOfDay, $lte: endOfDay } },
          { "tar.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "tcr.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "dph.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "numDeliveries.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "onlineHours.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "onTaskHours.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "idleHours.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "tarShownTasks.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "tarStartedTasks.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          { "cashBalance.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
          {
            earnings: {
              $elemMatch: { updatedAt: { $gte: startOfDay, $lte: endOfDay } },
            },
          },
        ],
      });

      if (stats.length > 0) {
        results.push({
          date: startOfDay, // Keeping it in Unix milliseconds format
          stats,
        });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this route for manual tracking
router.post("/track-idle-couriers", async (req, res) => {
  try {
    // Start tracking in the background
    Scheduler.runTrackingNow();

    res.json({ message: "Idle courier tracking started" });
  } catch (error) {
    logger.error("Error triggering idle courier tracking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
