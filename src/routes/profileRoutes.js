import express from "express";
import { getProfiles, searchProfiles } from "../controllers/profileController.js";

const router = express.Router();

router.get("/profiles", getProfiles);
router.get("/profiles/search", searchProfiles);

export default router;