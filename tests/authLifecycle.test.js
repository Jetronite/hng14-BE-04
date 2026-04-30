import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import axios from 'axios';
import dotenv from 'dotenv';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { RefreshToken } from '../src/models/RefreshToken.js';

dotenv.config();

// Axios spies
const axiosPostSpy = jest.spyOn(axios, 'post');
const axiosGetSpy = jest.spyOn(axios, 'get');

jest.setTimeout(60000);

// --------------------
// DB SETUP
// --------------------
beforeAll(async () => {
  const uri =
    process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/auth_test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  // 🔥 WAIT until fully connected
  await new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) return resolve();
    mongoose.connection.once('open', resolve);
  });
});

// --------------------
// TEST ISOLATION
// --------------------
beforeEach(() => {
  axiosPostSpy.mockClear();
  axiosGetSpy.mockClear();
});

afterEach(async () => {
  jest.useRealTimers();

  if (mongoose.connection.readyState === 1) {
    await RefreshToken.deleteMany({});
    await User.deleteMany({});
  }

  axiosPostSpy.mockClear();
  axiosGetSpy.mockClear();
});

afterAll(async () => {
  await mongoose.connection.close();
});

// --------------------
// TEST SUITE
// --------------------
describe('Auth System Lifecycle & Security (Hybrid)', () => {

  // 1. GOLDEN PATH
  it('should authenticate via GitHub, set cookies, and persist refresh token', async () => {
    axios.post.mockResolvedValueOnce({
      data: { access_token: 'gh_access_token_123' }
    });

    axios.get.mockImplementation((url) => {
      if (url.includes('/user/emails')) {
        return Promise.resolve({
          data: [{ email: 'test@example.com', primary: true }]
        });
      }
      return Promise.resolve({
        data: { id: '12345', login: 'testuser' }
      });
    });

    const redirectRes = await request(app).get('/auth/github');
    const redirectUrl = new URL(redirectRes.header.location);
    const state = redirectUrl.searchParams.get('state');

    const response = await request(app)
      .get('/auth/github/callback')
      .query({ code: 'valid-code', state });

    expect(response.status).toBe(302);
    expect(response.header.location).toBe(
      `${process.env.FRONTEND_URL}/dashboard`
    );

    const cookies = response.header['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('access_token'))).toBe(true);
    expect(cookies.some(c => c.includes('refresh_token'))).toBe(true);

    const user = await User.findOne({ email: 'test@example.com' });
    const savedToken = await RefreshToken.findOne({ user_id: user.id });

    expect(savedToken).not.toBeNull();

    // expiry sanity check (~5 mins ahead)
    const expiryTime = new Date(savedToken.expires_at).getTime();
    expect(expiryTime).toBeGreaterThan(Date.now() + 4 * 60 * 1000);
  });

  // 2. TOKEN ROTATION
  it('should rotate refresh token and delete the old one', async () => {
    const user = await User.create({
      id: 'u123',
      github_id: 'gh123',
      email: 't@t.com',
      is_active: true
    });

    const oldToken = jwt.sign(
      { userId: user.id, jti: 'old-jti' },
      process.env.JWT_REFRESH,
      { expiresIn: '1hr' }
    );

    await RefreshToken.create({
      token: oldToken,
      user_id: user.id,
      expires_at: new Date(Date.now() + 60 * 60 * 1000)
    });

    const response = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${oldToken}`, 'csrf_token=test-csrf-token'])
      .set('x-csrf-token', 'test-csrf-token');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');

    expect(await RefreshToken.findOne({ token: oldToken })).toBeNull();

    const newToken = await RefreshToken.findOne({ user_id: user.id });
    expect(newToken).not.toBeNull();
    expect(newToken.token).not.toBe(oldToken);
  });

  // 3. HARD EXPIRY
  it('should reject expired refresh token and delete it', async () => {

    const user = await User.create({
      id: 'u999',
      email: 'expired@test.com',
      github_id: 'gh999',
      is_active: true
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH,
      { expiresIn: '-1s' }
    );

    await RefreshToken.create({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() - 1000)
    });

    const response = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${token}`, 'csrf_token=test-csrf-token'])
      .set('x-csrf-token', 'test-csrf-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/expired|invalid/i);

    expect(await RefreshToken.findOne({ token })).toBeNull();
  });

  // 4. LOGOUT
  it('should clear cookies and delete refresh token on logout', async () => {

    const user = await User.create({
      id: 'ulog',
      email: 'logout@test.com',
      github_id: 'ghlog',
      is_active: true
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH,
      { expiresIn: '5m' }
    );

    await RefreshToken.create({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    const response = await request(app)
      .post('/auth/logout')
      .set('Cookie', [`refresh_token=${token}`, 'csrf_token=test-csrf-token'])
      .set('x-csrf-token', 'test-csrf-token');

    expect(response.status).toBe(200);

    const cookieHeader = response.header['set-cookie'].join(',');
    expect(cookieHeader).toMatch(/access_token=;/);
    expect(cookieHeader).toMatch(/refresh_token=;/);

    expect(await RefreshToken.findOne({ token })).toBeNull();
  });

  // 5. REPLAY ATTACK
  it('should reject reuse of a rotated refresh token', async () => {
    const user = await User.create({
      id: 'ureplay',
      email: 'replay@test.com',
      github_id: 'ghrep',
      is_active: true
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH,
      { expiresIn: '5m' }
    );

    await RefreshToken.create({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    // first valid use
    await request(app)
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${token}`, 'csrf_token=test-csrf-token'])
      .set('x-csrf-token', 'test-csrf-token');

    // replay attempt
    const replay = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${token}`, 'csrf_token=test-csrf-token'])
      .set('x-csrf-token', 'test-csrf-token');

    expect(replay.status).toBe(401);
    expect(replay.body.message).toMatch(/invalid|expired|revoked/i);
  });

});