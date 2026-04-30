import express from 'express';
import { 
  githubRedirect, 
  githubCallback, 
  registerPkceSession,
  refreshTokenHandler, 
  logoutHandler,
  getMe
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireCsrf } from '../middlewares/csrf.middleware.js';

const router = express.Router();

// OAuth Flow
router.get('/github', githubRedirect);
router.get('/github/callback', githubCallback);
router.post('/pkce', registerPkceSession);

// Session Management
router.post('/refresh', requireCsrf, refreshTokenHandler);
router.post('/logout', requireCsrf, logoutHandler);

// Identity (New command requirement)
router.get('/me', authenticate, getMe);

export default router;