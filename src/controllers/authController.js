import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { findOrCreateUser } from '../services/user.service.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../models/User.js';

dotenv.config();

const pkceSessions = new Map();
const PKCE_TIMEOUT_MS = 5 * 60 * 1000;

const cleanupPkceSessions = () => {
  const now = Date.now();
  for (const [key, value] of pkceSessions) {
    if (value.expiresAt <= now) {
      pkceSessions.delete(key);
    }
  }
};

setInterval(cleanupPkceSessions, 60 * 1000);

const savePkceSession = ({ state, codeVerifier, returnUrl, clientType }) => {
  pkceSessions.set(state, {
    codeVerifier,
    returnUrl,
    clientType,
    expiresAt: Date.now() + PKCE_TIMEOUT_MS
  });
};

export const registerPkceSession = (req, res) => {
  const { state, code_verifier: codeVerifier, return_url: returnUrl } = req.body;

  if (!state || !codeVerifier) {
    return res.status(400).json({ status: 'error', message: 'Missing PKCE session data' });
  }

  savePkceSession({
    state,
    codeVerifier,
    returnUrl: returnUrl || '',
    clientType: 'cli'
  });

  return res.status(200).json({ status: 'success' });
};

export const githubRedirect = (req, res) => {
  let { code_challenge: codeChallenge, state } = req.query;

  if (!state) {
    state = crypto.randomBytes(16).toString('hex');
  }

  const existingSession = pkceSessions.get(state);

  if (!codeChallenge) {
    if (existingSession && existingSession.codeVerifier) {
      codeChallenge = crypto.createHash('sha256').update(existingSession.codeVerifier).digest('base64url');
    } else {
      const codeVerifier = crypto.randomBytes(64).toString('base64url');
      codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

      savePkceSession({
        state,
        codeVerifier,
        returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`,
        clientType: 'web'
      });
    }
  } else if (!existingSession) {
    return res.status(400).json({ status: 'error', message: 'PKCE session not found. Retry login.' });
  }

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
};

export const githubCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ status: 'error', message: 'Invalid OAuth callback' });
    }

    const session = pkceSessions.get(state);
    if (!session || !session.codeVerifier) {
      return res.status(400).json({ status: 'error', message: 'PKCE session expired or missing' });
    }

    pkceSessions.delete(state);

    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        code_verifier: session.codeVerifier,
        redirect_uri: process.env.GITHUB_CALLBACK_URL
      },
      { headers: { Accept: 'application/json' } }
    );

    if (tokenResponse.data.error) {
      console.error('OAuth Error:', tokenResponse.data.error_description);
      return res.status(401).json({ status: 'error', message: tokenResponse.data.error_description });
    }

    const githubAccessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubAccessToken}` }
    });

    const emailResponse = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${githubAccessToken}` }
    });

    const primaryEmail = emailResponse.data.find((e) => e.primary)?.email;
    const user = await findOrCreateUser(userResponse.data, primaryEmail);

    const payload = { userId: user.id, role: user.role };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3m' });
    const jti = uuidv7();
    const refreshToken = jwt.sign({ userId: user.id, jti }, process.env.JWT_REFRESH, { expiresIn: '5m' });

    await RefreshToken.create({
      token: refreshToken,
      user_id: user.id,
      expires_at: new Date(Date.now() + PKCE_TIMEOUT_MS)
    });

    if (session.clientType === 'cli') {
      const returnUrl = session.returnUrl || 'http://localhost:5678/callback';
      return res.redirect(`${returnUrl}?access_token=${accessToken}&refresh_token=${refreshToken}&state=${state}`);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const csrfToken = crypto.randomBytes(24).toString('hex');

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 3 * 60 * 1000
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000
    });

    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000
    });

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('Auth Error:', error.response?.data || error.message);
    return res.status(500).json({ status: 'error', message: 'Authentication failed' });
  }
};

export const refreshTokenHandler = async (req, res) => {
  // 1. Get the refresh token from cookies
  const refreshToken = req.cookies.refresh_token || req.body.refresh_token;;

  if (!refreshToken) {
    return res.status(401).json({ status: "error", message: "Refresh token missing" });
  }

  try {
    // 2. Verify JWT Signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH);

    // 3. Check Database (Stateful Check)
    const existingToken = await RefreshToken.findOne({ token: refreshToken });

    if (!existingToken) {
      // SECURITY ALERT: If the JWT is valid but NOT in our DB, it might be a reuse attack.
      return res.status(401).json({ status: "error", message: "Invalid or revoked session" });
    }

    // 4. ROTATE: Delete the old token immediately
    await RefreshToken.deleteOne({ _id: existingToken._id });

    // 5. Check User Status
    const user = await User.findOne({ id: decoded.userId });

    if (!user || !user.is_active) {
      return res.status(403).json({ status: "error", message: "User inactive or not found" });
    }

    // 6. Issue New Tokens
    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "3m" }
    );

    const newJti = uuidv7();

    const newRefreshToken = jwt.sign(
      { userId: user.id, jti: newJti },
      process.env.JWT_REFRESH,
      { expiresIn: "5m" }
    );

    // 7. Store the NEW Refresh Token in DB
    await RefreshToken.create({
      token: newRefreshToken,
      user_id: user.id,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    // 7. RESPOND BASED ON CLIENT TYPE
    if (req.body.refresh_token) {
      return res.json({ status: "success", access_token: newAccessToken, refresh_token: newRefreshToken });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const csrfToken = req.cookies.csrf_token || crypto.randomBytes(24).toString('hex');

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 3 * 60 * 1000
    });
    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000
    });
    res.cookie("csrf_token", csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000
    });

    return res.json({ status: "success", message: "Tokens rotated" });

  } catch (err) {
    // If it's an expired error, we can proactively delete it from the DB
    if (err.name === 'TokenExpiredError') {
      const refreshToken = req.cookies.refresh_token;
      await RefreshToken.deleteOne({ token: refreshToken });
    }     // If verification fails or tampered
    return res.status(401).json({ status: "error", message: "Session expired" });
  }
};


export const logoutHandler = async (req, res) => {
  try {
    // 1. Get the token from the cookie
    const refreshToken = req.cookies.refresh_token;

    // 2. If token exists, delete it from MongoDB
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    const cookieOptions = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    };

    res.clearCookie("access_token", { ...cookieOptions, httpOnly: true });
    res.clearCookie("refresh_token", { ...cookieOptions, httpOnly: true });
    res.clearCookie("csrf_token", { ...cookieOptions, httpOnly: false });

    return res.status(200).json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Logout failed"
    });
  }
};


// src/controllers/authController.js

export const getMe = async (req, res) => {
  try {
    // req.user is populated by your authenticate middleware
    if (!req.user) {
      return res.status(401).json({ status: "error", message: "Not authenticated" });
    }

    // Return the full user data from middleware (includes username, avatar_url)
    return res.status(200).json({
      status: "success",
      data: {
        user: {
          id: req.user.id,
          role: req.user.role,
          username: req.user.username,
          avatar_url: req.user.avatar_url
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
};