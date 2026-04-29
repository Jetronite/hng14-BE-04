import express from "express";
import { 
  getProfiles, 
  searchProfiles, 
  deleteProfile, 
  createProfile, 
  exportProfiles 
} from "../controllers/profileController.js";
import { authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Mixed Roles (Analyst & Admin)
router.get("/", authorize("admin", "analyst"), getProfiles); 
router.get("/search", authorize("admin", "analyst"), searchProfiles);

// Admin Only
router.post("/", authorize("admin"), createProfile); 
router.get("/export", authorize("admin"), exportProfiles); 
router.delete("/:id", authorize("admin"), deleteProfile); 

export default router;