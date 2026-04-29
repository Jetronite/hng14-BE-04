import mongoose from "mongoose";
import { User } from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const makeAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    const github_id = process.env.GITHUB_ID; // 👈 put your GitHub ID here

    const result = await User.updateOne(
      { github_id },
      // { role: "admin" }
      { role: "analyst" }
    );

    console.log("Update result:", result);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

makeAdmin();