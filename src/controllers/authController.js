import axios from 'axios';
import jwt from 'jsonwebtoken';
import { findOrCreateUser } from '../services/user.service.js';
import dotenv from 'dotenv';
import { RefreshToken } from '../models/RefreshToken.js';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../models/User.js';

dotenv.config();

export const githubCallback = async (req, res) => {
  try {

    const { code, state } = req.query; // 'state' helps us identify the caller

    if (!code) {
      return res.status(400).json({ status: "error", message: "No code provided" });
    }

    // Step 3A: Exchange code for Access Token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    // DEBUG: Look at what GitHub actually said
    console.log("GitHub Response Data:", tokenResponse.data);

    if (tokenResponse.data.error) {
      console.error("OAuth Error:", tokenResponse.data.error_description);
      return res.status(401).json({ status: "error", message: tokenResponse.data.error_description });
    }

    const githubAccessToken = tokenResponse.data.access_token;

    // Step 3B: Get GitHub User Data
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });

    // Step 3C: Get GitHub Emails (since primary email can be private)
    const emailResponse = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });
    const primaryEmail = emailResponse.data.find(e => e.primary)?.email;

    // Step 4: Use your Service to save the user
    const user = await findOrCreateUser(userResponse.data, primaryEmail);

    // 🔐 Step 5: Issue Tokens
    // The "Payload" contains the essential user info
    const payload = {
      userId: user.id,
      role: user.role,
    };

    // Access Token - Short expiry for security
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    );

    console.log("Access Token: " + accessToken)

    const jti = uuidv7() // Unique identifier for the token, useful for blacklisting
    // Refresh Token - Longer expiry
    const refreshToken = jwt.sign(
      { userId: user.id, jti }, // Refresh tokens usually need less info
      process.env.JWT_REFRESH,
      { expiresIn: '5m' }
    );

    await RefreshToken.create({
      token: refreshToken,
      user_id: user.id,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    // If 'state' is not 'web', we assume it's the CLI's state/callback
    if (state && state !== 'web') {
      // Send tokens back to CLI local server via URL parameters
      const cliCallbackUrl = `http://localhost:5678/callback?access_token=${accessToken}&refresh_token=${refreshToken}&state=${state}`;
      return res.redirect(cliCallbackUrl);
    }

    // 📦 Step 6: Return Tokens via Secure Cookies
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("access_token", accessToken, {
      httpOnly: true, // Prevents JavaScript from reading the cookie
      secure: isProduction, // Only sends over HTTPS in prod
      sameSite: "lax",
      maxAge: 3 * 60 * 1000, // 3 minutes
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000, // 5 minutes
    });

    // Redirect the user back to your frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);

  } catch (error) {
    console.error("Auth Error:", error.response?.data || error.message);
    return res.status(500).json({ status: "error", message: "Authentication failed" });
  }
};

export const githubRedirect = (req, res) => {
  // Capture PKCE and custom redirect info from the CLI request
  const { code_challenge, state } = req.query;


  // These are the parameters GitHub needs to know who is asking for authentication and where to send the user back after login.
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: "read:user user:email", // We ask for identity and email
    state: state || 'web', // If no state, assume it's the web app
  });

  const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  // This sends the user to GitHub's login page
  res.redirect(githubUrl);
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
      // CLI Request: Return as JSON
      return res.json({
        status: "success",
        access_token: newAccessToken,
        refresh_token: newRefreshToken
      });
    }
    // Web Request: Return via Cookies
    // 8. Update Cookies
    const isProduction = process.env.NODE_ENV === "production";
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

    // 3. Clear the cookies on the browser
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    };
    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully"
    });
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