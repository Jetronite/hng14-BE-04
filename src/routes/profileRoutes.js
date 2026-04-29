import express from "express";
import { getProfiles, searchProfiles, deleteProfile } from "../controllers/profileController.js";
import { authorize } from "../middlewares/auth.middleware.js";


const router = express.Router();

// Remove "/profiles" from here because it's added in app.js
router.get("/", getProfiles); 
router.get("/search", searchProfiles);
router.delete("/:id", authorize("admin"), deleteProfile); // Add this here!

export default router;