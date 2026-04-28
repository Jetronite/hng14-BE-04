import mongoose from "mongoose";

import { v7 as uuidv7 } from "uuid";
import dotenv from "dotenv";

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

import Profile from "../models/Profile.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

const MONGO_URI = process.env.MONGO_URI;

const seed = async () => {
  try {
    console.log("🚀 Seeder started...");
    
    if (!MONGO_URI) throw new Error("MONGO_URI is undefined. Check your .env file.");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to DB");
    console.log(`📡 Connected to database: ${mongoose.connection.name}`);

    // Use absolute path for reliability
    const dataPath = path.resolve(__dirname, "../data/seed_profiles.json");
    const raw = fs.readFileSync(dataPath, "utf-8");
    const { profiles } = JSON.parse(raw);

    // Prepare bulk operations
    const operations = profiles.map((p) => {
      const formatted = {
        id: uuidv7(),
        name: p.name.toLowerCase(),
        gender: p.gender,
        gender_probability: p.gender_probability,
        age: p.age,
        age_group: p.age_group,
        country_id: p.country_id,
        country_name: p.country_name,
        country_probability: p.country_probability,
        created_at: new Date()
      };

      return {
        updateOne: {
          filter: { name: formatted.name },
          update: { $setOnInsert: formatted },
          upsert: true
        }
      };
    });

    console.log(`⏳ Processing ${operations.length} profiles...`);
    const result = await Profile.bulkWrite(operations);
    
    console.log("✅ Seeding complete");
    console.log(`   Upserted: ${result.upsertedCount}`);
    console.log(`   Matched (Duplicates skipped): ${result.matchedCount}`);

  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

seed();