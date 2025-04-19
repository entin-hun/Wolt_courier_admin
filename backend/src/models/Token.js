import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Number,
    required: true,
  },
  updatedAt: {
    type: Number,
    default: () => Date.now(),
  },
});

tokenSchema.index({ expiresAt: 1 });

export default mongoose.model("Token", tokenSchema);
