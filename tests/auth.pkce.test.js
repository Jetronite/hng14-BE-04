import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import axios from 'axios';

const axiosPostSpy = jest.spyOn(axios, 'post');
const axiosGetSpy = jest.spyOn(axios, 'get');

describe('Authentication & PKCE Flow', () => {
  beforeAll(async () => {
    const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/stage3_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  beforeEach(() => {
    axiosPostSpy.mockClear();
    axiosGetSpy.mockClear();
  });

  afterEach(async () => {
    await RefreshToken.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('PKCE Session Registration', () => {
    it('should register PKCE session and return success', async () => {
      const res = await request(app)
        .post('/auth/pkce')
        .send({
          state: 'test-state-123',
          code_verifier: 'test-verifier',
          return_url: 'http://localhost:5678/callback'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('PKCE session registered');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/auth/pkce')
        .send({ state: 'test-state' }); // missing code_verifier and return_url

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GitHub OAuth Redirect', () => {
    it('should redirect to GitHub OAuth URL', async () => {
      const res = await request(app).get('/auth/github');

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('https://github.com/login/oauth/authorize');
      expect(res.header.location).toContain('client_id=');
      // Scope is URL-encoded: space becomes +
      expect(res.header.location).toContain('scope=read:user+user:email');
    });
  });

  describe('GitHub OAuth Callback', () => {
    it('should handle successful OAuth callback and create user', async () => {
      // Mock GitHub API responses
      axiosPostSpy.mockResolvedValueOnce({
        data: { access_token: 'gh_access_token_123' }
      });

      axiosGetSpy.mockImplementation((url) => {
        if (url.includes('/user/emails')) {
          return Promise.resolve({
            data: [{ email: 'test@example.com', primary: true }]
          });
        }
        if (url.includes('/user')) {
          return Promise.resolve({
            data: {
              id: 12345,
              login: 'testuser',
              avatar_url: 'https://github.com/avatar.png'
            }
          });
        }
      });

      const redirectRes = await request(app).get('/auth/github');
      const redirectUrl = new URL(redirectRes.header.location);
      const state = redirectUrl.searchParams.get('state');

      const res = await request(app)
        .get('/auth/github/callback')
        .query({
          code: 'valid-oauth-code',
          state
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('/dashboard');

      // Check cookies are set
      const cookies = res.header['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('access_token='))).toBe(true);
      expect(cookies.some(c => c.includes('refresh_token='))).toBe(true);
      expect(cookies.some(c => c.includes('csrf_token='))).toBe(true);

      // Check user was created
      const user = await User.findOne({ github_id: '12345' });
      expect(user).toBeTruthy();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('analyst'); // default role
      expect(user.is_active).toBe(true);
    });

    it('should handle OAuth callback with invalid state', async () => {
      const res = await request(app)
        .get('/auth/github/callback')
        .query({
          code: 'valid-code',
          state: 'invalid-state'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid state');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens and invalidate old refresh token', async () => {
      const user = await User.create({
        id: 'test-user-id',
        github_id: 'gh123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'analyst',
        is_active: true
      });

      const oldRefreshToken = jwt.sign(
        { userId: user.id, jti: 'old-jti' },
        process.env.JWT_REFRESH,
        { expiresIn: '5m' }
      );

      await RefreshToken.create({
        token: oldRefreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 5 * 60 * 1000)
      });

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${oldRefreshToken}`, 'csrf_token=csrf-token-value'])
        .set('x-csrf-token', 'csrf-token-value');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
    });

    it('should reject refresh without CSRF token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=some-token');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid CSRF token');
    });
  });

  describe('Logout', () => {
    it('should logout and invalidate refresh token', async () => {
      const user = await User.create({
        id: 'test-user-id',
        github_id: 'gh123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'analyst',
        is_active: true
      });

      const refreshToken = jwt.sign(
        { userId: user.id, jti: 'test-jti' },
        process.env.JWT_REFRESH,
        { expiresIn: '5m' }
      );

      await RefreshToken.create({
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 5 * 60 * 1000)
      });

      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=csrf-token-value'])
        .set('x-csrf-token', 'csrf-token-value');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Token should be deleted
      const tokenExists = await RefreshToken.findOne({ token: refreshToken });
      expect(tokenExists).toBeNull();
    });
  });

  describe('Get Me Endpoint', () => {
    it('should return current user info', async () => {
      const user = await User.create({
        id: 'test-user-id',
        github_id: 'gh123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'analyst',
        is_active: true
      });

      const accessToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '3m' }
      );

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.username).toBe('testuser');
      expect(res.body.data.user.role).toBe('analyst');
    });
  });
});