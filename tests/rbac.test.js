import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import jwt from 'jsonwebtoken';

describe('Role-Based Access Control', () => {
  let adminToken;
  let analystToken;
  let inactiveUserToken;

  beforeAll(async () => {
    const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/stage3_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Create test users
    const adminUser = await User.create({
      id: 'admin-user-id',
      github_id: 'admin123',
      username: 'adminuser',
      email: 'admin@example.com',
      role: 'admin',
      is_active: true
    });

    const analystUser = await User.create({
      id: 'analyst-user-id',
      github_id: 'analyst123',
      username: 'analystuser',
      email: 'analyst@example.com',
      role: 'analyst',
      is_active: true
    });

    const inactiveUser = await User.create({
      id: 'inactive-user-id',
      github_id: 'inactive123',
      username: 'inactiveuser',
      email: 'inactive@example.com',
      role: 'analyst',
      is_active: false
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    );

    analystToken = jwt.sign(
      { userId: analystUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    );

    inactiveUserToken = jwt.sign(
      { userId: inactiveUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Profile Creation (Admin Only)', () => {
    it('should allow admin to create profile', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-API-Version', '1')
        .send({ name: 'Test Profile' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Test Profile');
    });

    it('should deny analyst from creating profile', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1')
        .send({ name: 'Test Profile' });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Forbidden');
    });

    it('should deny inactive user from creating profile', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${inactiveUserToken}`)
        .set('X-API-Version', '1')
        .send({ name: 'Test Profile' });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('Profile Reading (All Authenticated Users)', () => {
    it('should allow admin to list profiles', async () => {
      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should allow analyst to list profiles', async () => {
      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should deny inactive user from listing profiles', async () => {
      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${inactiveUserToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Profile Search (All Authenticated Users)', () => {
    it('should allow analyst to search profiles', async () => {
      const res = await request(app)
        .get('/api/profiles/search?q=test')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Profile Detail View (All Authenticated Users)', () => {
    it('should allow analyst to get profile by ID', async () => {
      // First create a profile as admin
      const createRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-API-Version', '1')
        .send({ name: 'Detail Test Profile' });

      const profileId = createRes.body.data.id;

      // Now try to get it as analyst
      const res = await request(app)
        .get(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Detail Test Profile');
    });
  });

  describe('Profile Export (All Authenticated Users)', () => {
    it('should allow analyst to export profiles', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('attachment');
    });
  });

  describe('Authentication Required', () => {
    it('should require authentication for all /api/* endpoints', async () => {
      const endpoints = [
        '/api/profiles',
        '/api/profiles/search?q=test',
        '/api/profiles/export'
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)
          .get(endpoint)
          .set('X-API-Version', '1');

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Authentication required');
      }
    });
  });
});