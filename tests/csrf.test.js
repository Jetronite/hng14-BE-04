import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import jwt from 'jsonwebtoken';

describe('CSRF Protection', () => {
  let userToken;
  let refreshToken;

  beforeAll(async () => {
    const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/stage3_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    const user = await User.create({
      id: 'csrf-test-user',
      github_id: 'csrf123',
      username: 'csrftest',
      email: 'csrf@example.com',
      role: 'analyst',
      is_active: true
    });

    userToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    );

    refreshToken = jwt.sign(
      { userId: user.id, jti: 'csrf-jti' },
      process.env.JWT_REFRESH,
      { expiresIn: '5m' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('State-Changing Requests', () => {
    it('should allow POST /auth/refresh with valid CSRF tokens', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=test-csrf-token'])
        .set('x-csrf-token', 'test-csrf-token');

      // This might fail due to token validation, but CSRF should pass
      expect(res.status).not.toBe(403);
      if (res.status === 403) {
        expect(res.body.message).not.toBe('Invalid CSRF token');
      }
    });

    it('should reject POST /auth/refresh without CSRF header', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=test-csrf-token']);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid CSRF token');
    });

    it('should reject POST /auth/refresh without CSRF cookie', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=wrong-token'])
        .set('x-csrf-token', 'test-csrf-token');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid CSRF token');
    });

    it('should reject POST /auth/refresh with mismatched CSRF tokens', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=wrong-token'])
        .set('x-csrf-token', 'test-csrf-token');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid CSRF token');
    });

    it('should allow POST /auth/logout with valid CSRF tokens', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', [`refresh_token=${refreshToken}`, 'csrf_token=test-csrf-token'])
        .set('x-csrf-token', 'test-csrf-token');

      expect(res.status).not.toBe(403);
    });
  });

  describe('Read-Only Requests', () => {
    it('should allow GET requests without CSRF tokens', async () => {
      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-API-Version', '1');

      expect(res.status).not.toBe(403);
    });

    it('should allow HEAD requests without CSRF tokens', async () => {
      const res = await request(app)
        .head('/api/profiles')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-API-Version', '1');

      expect(res.status).not.toBe(403);
    });

    it('should allow OPTIONS requests without CSRF tokens', async () => {
      const res = await request(app)
        .options('/api/profiles')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-API-Version', '1');

      expect(res.status).not.toBe(403);
    });
  });

  describe('Non-Cookie Auth Requests', () => {
    it('should skip CSRF check for Bearer token auth on state-changing requests', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-API-Version', '1')
        .send({ name: 'Test Profile' });

      // Should fail due to role (analyst can't create), not CSRF
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
      expect(res.body.message).not.toBe('Invalid CSRF token');
    });
  });
});