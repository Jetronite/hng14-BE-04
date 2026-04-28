import express from 'express';
import { githubRedirect, githubCallback } from '../controllers/authController.js';

const router = express.Router();

// This matches Step 2: GET /auth/github
router.get('/github', githubRedirect);

// This matches Step 3 (The Callback - we will build this next)
router.get('/github/callback', githubCallback); // Add this line

export default router;