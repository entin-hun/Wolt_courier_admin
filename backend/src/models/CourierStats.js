import mongoose from "mongoose";

const metricValueSchema = new mongoose.Schema(
  {
    value: Number,
    updatedAt: Number,
  },
  { _id: false }
);
const earningSchema = new mongoose.Schema(
  {
    amount: Number,
    updatedAt: Number,
    transactionType: String,
    currencyCode: {
      type: String,
      default: "HUF",
    },
    companyId: String,
  },
  { _id: false }
);

const courierStatsSchema = new mongoose.Schema({
  courierId: {
    type: Number,
    required: true,
    ref: "Courier",
  },
  date: {
    type: Number,
    required: true,
    default: function () {
      return new Date().setHours(0, 0, 0, 0); // Midnight in milliseconds
    },
  },
  latestUpdate: {
    type: Number, // Unix timestamp in milliseconds
    default: () => Date.now(),
  },
  tar: metricValueSchema,
  tcr: metricValueSchema,
  dph: metricValueSchema,
  numDeliveries: metricValueSchema,
  onlineHours: metricValueSchema,
  onTaskHours: metricValueSchema,
  idleHours: metricValueSchema,
  tarShownTasks: metricValueSchema,
  tarStartedTasks: metricValueSchema,
  earnings: [earningSchema], // Now an arrays
  cashBalance: {
    amount: Number,
    updatedAt: Number,
    currencyCode: {
      type: String,
      default: "HUF",
    },
    companyId: String,
  },
  collectionDate: {
    type: Number,
    default: () => Date.now(),
  },
});

// Middleware to update `latestUpdate` when any tracked field changes
courierStatsSchema.pre("save", function (next) {
  this.latestUpdate = Date.now(); // Set to the current timestamp
  next();
});

// Create a compound index for courier and date
courierStatsSchema.index({ courierId: 1, date: 1 }, { unique: true });
courierStatsSchema.index({ date: 1 });

export default mongoose.model("CourierStats", courierStatsSchema);
