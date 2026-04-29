import express from 'express';
import { 
  githubRedirect, 
  githubCallback, 
  refreshTokenHandler, 
  logoutHandler,
  getMe // You'll need this for 'insighta whoami'
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// OAuth Flow
router.get('/github', githubRedirect);
router.get('/github/callback', githubCallback); 

// Session Management
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logoutHandler);

// Identity (New command requirement)
router.get('/me', authenticate, getMe);

export default router;