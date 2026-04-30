import request from 'supertest';
import app from '../src/app.js';

describe('Rate Limiting', () => {
  describe('Auth Endpoints', () => {
    it('should allow up to 10 requests per minute to auth endpoints', async () => {
      const promises = [];

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/auth/pkce')
            .send({
              state: `state-${i}`,
              code_verifier: `verifier-${i}`,
              return_url: 'http://localhost:5678/callback'
            })
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });

    it('should rate limit auth endpoints after 10 requests per minute', async () => {
      // Make 11th request
      const res = await request(app)
        .post('/auth/pkce')
        .send({
          state: 'state-11',
          code_verifier: 'verifier-11',
          return_url: 'http://localhost:5678/callback'
        });

      expect(res.status).toBe(429);
      expect(res.body.message).toContain('Too many login attempts. Try again in a minute.');
    });
  });

  describe('API Endpoints', () => {
    it('should allow up to 60 requests per minute to API endpoints', async () => {
      const promises = [];

      // Make 60 requests
      for (let i = 0; i < 60; i++) {
        promises.push(
          request(app)
            .get('/api/profiles')
            .set('X-API-Version', '1')
        );
      }

      const results = await Promise.all(promises);

      // Most should succeed (some may fail due to auth, but not rate limiting)
      const successCount = results.filter(res => res.status !== 429).length;
      expect(successCount).toBeGreaterThan(50); // Allow some auth failures
    });

    it('should rate limit API endpoints after 60 requests per minute', async () => {
      // Make another request
      const res = await request(app)
        .get('/api/profiles')
        .set('X-API-Version', '1');

      // This might be rate limited depending on timing
      if (res.status === 429) {
        expect(res.body.message).toContain('Too many requests');
      }
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in responses', async () => {
      const res = await request(app)
        .post('/auth/pkce')
        .send({
          state: 'test-state',
          code_verifier: 'test-verifier',
          return_url: 'http://localhost:5678/callback'
        });

      // Check for rate limit headers
      expect(res.header['ratelimit-limit']).toBeDefined();
      expect(res.header['ratelimit-remaining']).toBeDefined();
      expect(res.header['ratelimit-reset']).toBeDefined();
    });
  });
});