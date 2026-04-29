import express from 'express';
import { githubRedirect, githubCallback, refreshTokenHandler, logoutHandler } from '../controllers/authController.js';
import { authorize } from '../middlewares/auth.middleware.js';
import { getProfiles, searchProfiles, createProfile, deleteProfile, exportProfiles } from '../controllers/profileController.js';

const router = express.Router();

router.get("/", authorize("admin", "analyst"), getProfiles);
router.get("/search", authorize("admin", "analyst"), searchProfiles);

router.post("/", authorize("admin"), createProfile);
router.delete("/:id", authorize("admin"), deleteProfile);

// This matches Step 2: GET /auth/github
router.get('/github', githubRedirect);

// This matches Step 3 The Callback
router.get('/github/callback', githubCallback); 

// The Session Management (Phase 4)
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logoutHandler);

// Add this for Phase 7
router.get("/export", authorize("admin", "analyst"), exportProfiles);
router.delete("/:id", authorize("admin"), deleteProfile);

export default router;