import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // UUID v7
  name: { type: String, required: true, unique: true },
  gender: { type: String, enum: ["male", "female"] },
  gender_probability: Number,
  age: Number,
  age_group: String,
  country_id: String,
  country_name: String,
  country_probability: Number,
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model("Profile", profileSchema);