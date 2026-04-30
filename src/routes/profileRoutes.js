import express from "express";
import { 
  getProfiles, 
  getProfileById,
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
router.get("/export", authorize("admin", "analyst"), exportProfiles);
router.get("/:id", authorize("admin", "analyst"), getProfileById); // support single profile fetch

// Admin Only
router.post("/", authorize("admin"), createProfile);
router.delete("/:id", authorize("admin"), deleteProfile);

export default router;