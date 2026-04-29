import express from 'express';
import { githubRedirect, githubCallback, refreshTokenHandler, logoutHandler } from '../controllers/authController.js';

const router = express.Router();

// This matches Step 2: GET /auth/github
router.get('/github', githubRedirect);

// This matches Step 3 The Callback
router.get('/github/callback', githubCallback); 

// The Session Management (Phase 4)
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logoutHandler);

export default router;