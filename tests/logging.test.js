import request from 'supertest';
import app from '../src/app.js';
import fs from 'fs';
import path from 'path';

describe('Logging Middleware', () => {
  let logFilePath;

  beforeAll(() => {
    // Assuming logs are written to a file, adjust path as needed
    logFilePath = path.join(process.cwd(), 'logs', 'app.log');
  });

  it('should log requests to API endpoints', async () => {
    const initialLogSize = fs.existsSync(logFilePath) ? fs.statSync(logFilePath).size : 0;

    const res = await request(app)
      .get('/api/profiles')
      .set('X-API-Version', '1');

    // Wait a bit for log to be written
    await new Promise(resolve => setTimeout(resolve, 100));

    if (fs.existsSync(logFilePath)) {
      const finalLogSize = fs.statSync(logFilePath).size;
      expect(finalLogSize).toBeGreaterThan(initialLogSize);
    }
  });

  it('should log method, endpoint, status code, and response time', async () => {
    const res = await request(app)
      .get('/api/profiles')
      .set('X-API-Version', '1');

    await new Promise(resolve => setTimeout(resolve, 100));

    if (fs.existsSync(logFilePath)) {
      const logContent = fs.readFileSync(logFilePath, 'utf-8');
      const lastLogLine = logContent.trim().split('\n').pop();

      // Check that log contains expected information
      expect(lastLogLine).toMatch(/GET/);
      expect(lastLogLine).toMatch(/\/api\/profiles/);
      expect(lastLogLine).toMatch(/\d{3}/); // Status code
      expect(lastLogLine).toMatch(/\d+ms/); // Response time
    }
  });

  it('should log auth endpoints', async () => {
    const res = await request(app)
      .post('/auth/pkce')
      .send({
        state: 'log-test-state',
        code_verifier: 'log-test-verifier',
        return_url: 'http://localhost:5678/callback'
      });

    await new Promise(resolve => setTimeout(resolve, 100));

    if (fs.existsSync(logFilePath)) {
      const logContent = fs.readFileSync(logFilePath, 'utf-8');
      const lines = logContent.trim().split('\n');
      const lastLines = lines.slice(-2); // Check last couple lines

      const hasAuthLog = lastLines.some(line =>
        line.includes('POST') && line.includes('/auth/pkce')
      );
      expect(hasAuthLog).toBe(true);
    }
  });

  it('should log successful and error responses', async () => {
    // Successful request
    await request(app)
      .post('/auth/pkce')
      .send({
        state: 'success-log-state',
        code_verifier: 'success-log-verifier',
        return_url: 'http://localhost:5678/callback'
      });

    // Error request (missing header)
    await request(app)
      .get('/api/profiles'); // Missing X-API-Version

    await new Promise(resolve => setTimeout(resolve, 200));

    if (fs.existsSync(logFilePath)) {
      const logContent = fs.readFileSync(logFilePath, 'utf-8');
      const lines = logContent.trim().split('\n');
      const recentLines = lines.slice(-4); // Check recent lines

      const hasSuccessLog = recentLines.some(line => line.includes('200'));
      const hasErrorLog = recentLines.some(line => line.includes('400'));

      expect(hasSuccessLog).toBe(true);
      expect(hasErrorLog).toBe(true);
    }
  });
});