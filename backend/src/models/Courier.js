import mongoose from "mongoose";

const courierSchema = new mongoose.Schema({
  courierId: {
    type: Number,
    required: true,
    unique: true,
  },
  firstName: String,
  lastName: String,
  name: String,
  email: String,
  phone: String,
  contractType: String,
  vehicleType: String,
  allowShiftReservation: Boolean,
  capabilities: [String],
  contractValidFrom: Number,
  isDisabled: Boolean,
  createdAt: {
    type: Number, // Unix timestamp in milliseconds
    default: () => Date.now(), // Automatically set
  },
  updatedAt: {
    type: Number, // Unix timestamp in milliseconds
    default: () => Date.now(), // Automatically set
  },
  codaIntegration: {
    codaRowId: String,
    lastSynced: {
      type: Number,
      default: () => Date.now(),
    },
  },
});

// Pre-save middleware to update timestamps
courierSchema.pre("save", function (next) {
  this.updatedAt = Date.now(); // Store in milliseconds
  if (this.isNew && !this.createdAt) {
    this.createdAt = Date.now();
  }
  next();
});

courierSchema.index({ email: 1 });
courierSchema.index({ phone: 1 });

export default mongoose.model("Courier", courierSchema);
