import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);