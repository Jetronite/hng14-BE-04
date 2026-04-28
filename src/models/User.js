import mongoose from "mongoose";
import { v7 as uuidv7 } from "uuid";

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv7,
    unique: true
  },
  github_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: String,
  email: String,
  avatar_url: String,

  role: {
    type: String,
    enum: ["admin", "analyst"],
    default: "analyst"
  },

  is_active: {
    type: Boolean,
    default: true
  },

  last_login_at: Date,

  created_at: {
    type: Date,
    default: Date.now
  }
});

export const User = mongoose.model("User", userSchema);