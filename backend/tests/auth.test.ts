import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

describe('Auth API Integration Tests', () => {
  const app = createApp();

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('registers a new user and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@scrollsense.io',
        password: 'Password123!',
        displayName: 'Test User',
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@scrollsense.io');
    expect(res.body.user.displayName).toBe('Test User');
    expect(res.body.user.passwordHash).toBeUndefined();

    // Verify stored user password was hashed
    const stored = await User.findOne({ email: 'test@scrollsense.io' });
    expect(stored).toBeDefined();
    expect(stored?.passwordHash).not.toBe('Password123!');
  });

  it('rejects duplicate email registration with 409 Conflict', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'duplicate@scrollsense.io',
        password: 'Password123!',
        displayName: 'First User',
      });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'duplicate@scrollsense.io',
        password: 'DifferentPassword!',
        displayName: 'Second User',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('authenticates valid credentials on login', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'login@scrollsense.io',
        password: 'SecretPassword99!',
        displayName: 'Login User',
      });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'login@scrollsense.io',
        password: 'SecretPassword99!',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login@scrollsense.io');
  });

  it('rejects invalid password on login with 401', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'wrong@scrollsense.io',
        password: 'CorrectPassword!',
        displayName: 'Wrong Pass User',
      });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'wrong@scrollsense.io',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid');
  });

  it('retrieves user profile via GET /api/v1/auth/me when authenticated', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'me@scrollsense.io',
        password: 'Password123!',
        displayName: 'Me User',
      });

    const token = regRes.body.token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('me@scrollsense.io');
    expect(meRes.body.user.displayName).toBe('Me User');
  });

  it('rejects unauthenticated requests to /api/v1/auth/me with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
