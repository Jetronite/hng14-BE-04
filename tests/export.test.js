import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import Profile from '../src/models/Profile.js';
import jwt from 'jsonwebtoken';

describe('Profile Export API', () => {
  let adminToken;
  let analystToken;

  beforeAll(async () => {
    const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/stage3_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Create test users
    const adminUser = await User.create({
      id: 'export-admin-id',
      github_id: 'exportadmin123',
      username: 'exportadmin',
      email: 'exportadmin@example.com',
      role: 'admin',
      is_active: true
    });

    const analystUser = await User.create({
      id: 'export-analyst-id',
      github_id: 'exportanalyst123',
      username: 'exportanalyst',
      email: 'exportanalyst@example.com',
      role: 'analyst',
      is_active: true
    });

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

    // Create test profiles
    await Profile.create([
      {
        id: 'profile-1',
        name: 'John Doe',
        gender: 'male',
        gender_probability: 0.95,
        age: 30,
        age_group: 'adult',
        country_id: 'US',
        country_name: 'United States',
        country_probability: 0.88,
        created_at: new Date()
      },
      {
        id: 'profile-2',
        name: 'Jane Smith',
        gender: 'female',
        gender_probability: 0.92,
        age: 25,
        age_group: 'adult',
        country_id: 'CA',
        country_name: 'Canada',
        country_probability: 0.85,
        created_at: new Date()
      }
    ]);
  });

  afterAll(async () => {
    await Profile.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('CSV Export', () => {
    it('should export profiles in CSV format', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toMatch(/profiles_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.csv/);

      const csvData = res.text;
      expect(csvData).toContain('"id","name","gender","gender_probability","age","age_group","country_id","country_name","country_probability","created_at"');
      expect(csvData).toContain('profile-1');
      expect(csvData).toContain('John Doe');
      expect(csvData).toContain('male');
      expect(csvData).toContain('profile-2');
      expect(csvData).toContain('Jane Smith');
      expect(csvData).toContain('female');
    });

    it('should apply filters to export', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv&gender=male')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      const csvData = res.text;

      // Should contain male profile but not female
      expect(csvData).toContain('John Doe');
      expect(csvData).toContain('male');
      expect(csvData).not.toContain('Jane Smith');
      expect(csvData).not.toContain('female');
    });

    it('should apply sorting to export', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv&sort_by=age&order=desc')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      const csvData = res.text;

      const lines = csvData.split('\n').filter(line => line.trim());
      // Skip header, first data line should be John Doe (age 30) before Jane Smith (age 25)
      const firstDataLine = lines[1];
      expect(firstDataLine).toContain('John Doe');
    });

    it('should include all required CSV columns', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      const csvData = res.text;

      const lines = csvData.split('\n').filter(line => line.trim());
      const header = lines[0];
      const columns = header.split(',').map(col => col.replace(/"/g, '').trim());

      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('gender');
      expect(columns).toContain('gender_probability');
      expect(columns).toContain('age');
      expect(columns).toContain('age_group');
      expect(columns).toContain('country_id');
      expect(columns).toContain('country_name');
      expect(columns).toContain('country_probability');
      expect(columns).toContain('created_at');

      expect(columns.length).toBe(10);
    });

    it('should use comma delimiter in CSV', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
      const csvData = res.text;

      // Check that fields are separated by commas
      const lines = csvData.split('\n').filter(line => line.trim());
      const dataLine = lines[1];
      const fields = dataLine.split(',');

      expect(fields.length).toBe(10); // Should have 10 columns
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for export', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv')
        .set('X-API-Version', '1');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication required');
    });

    it('should allow analyst to export', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Version', '1');

      expect(res.status).toBe(200);
    });
  });

  describe('API Version Requirement', () => {
    it('should require X-API-Version header for export', async () => {
      const res = await request(app)
        .get('/api/profiles/export?format=csv')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('API version header required');
    });
  });
});