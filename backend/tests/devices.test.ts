import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Device } from '../src/models/Device.js';
import { DevicePairing } from '../src/models/DevicePairing.js';

describe('Device Pairing & Management API Tests', () => {
  const app = createApp();
  let userToken: string;

  beforeEach(async () => {
    await User.deleteMany({});
    await Device.deleteMany({});
    await DevicePairing.deleteMany({});

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'device-owner@scrollsense.io',
        password: 'Password123!',
        displayName: 'Device Owner',
      });
    userToken = regRes.body.token;
  });

  it('runs complete extension pairing flow: request, approve, poll, list, and revoke', async () => {
    // 1. Extension requests pairing code
    const pairReqRes = await request(app)
      .post('/api/v1/devices/pair/request')
      .send({
        deviceId: 'chrome-ext-uuid-12345',
        deviceName: 'Workstation Chrome',
        extensionVersion: '1.0.0',
      });

    expect(pairReqRes.status).toBe(201);
    const pairingCode = pairReqRes.body.pairingCode;
    expect(pairingCode).toMatch(/^SS-[A-Z0-9]{4}$/);

    // 2. Poll status before approval -> PENDING
    const pollPendingRes = await request(app).get(`/api/v1/devices/pair/status/${pairingCode}`);
    expect(pollPendingRes.status).toBe(200);
    expect(pollPendingRes.body.status).toBe('PENDING');

    // 3. User approves pairing on web dashboard
    const approveRes = await request(app)
      .post('/api/v1/devices/pair/approve')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ pairingCode });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.message).toContain('successfully paired');

    // 4. Poll status after approval -> APPROVED + deviceToken
    const pollApprovedRes = await request(app).get(`/api/v1/devices/pair/status/${pairingCode}`);
    expect(pollApprovedRes.status).toBe(200);
    expect(pollApprovedRes.body.status).toBe('APPROVED');
    expect(pollApprovedRes.body.deviceToken).toBeDefined();
    const deviceToken = pollApprovedRes.body.deviceToken;

    // 5. User views paired devices
    const listRes = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${userToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.devices.length).toBe(1);
    expect(listRes.body.devices[0].deviceId).toBe('chrome-ext-uuid-12345');
    expect(listRes.body.devices[0].deviceName).toBe('Workstation Chrome');

    // 6. User revokes device
    const revokeRes = await request(app)
      .delete('/api/v1/devices/chrome-ext-uuid-12345')
      .set('Authorization', `Bearer ${userToken}`);

    expect(revokeRes.status).toBe(200);

    // 7. Verify device list is now empty
    const listAfterRes = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${userToken}`);

    expect(listAfterRes.body.devices.length).toBe(0);
  });

  it('allows CORS preflight and requests from chrome-extension origins', async () => {
    const extensionOrigin = 'chrome-extension://iceaaphkijalboljjdnnalepalpenafc';

    // Preflight OPTIONS request
    const optionsRes = await request(app)
      .options('/api/v1/devices/pair/request')
      .set('Origin', extensionOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');

    expect(optionsRes.status).toBe(204);
    expect(optionsRes.headers['access-control-allow-origin']).toBe(extensionOrigin);

    // Actual POST pairing request with extension origin
    const postRes = await request(app)
      .post('/api/v1/devices/pair/request')
      .set('Origin', extensionOrigin)
      .send({
        deviceId: 'chrome-ext-cors-test',
        deviceName: 'Chrome Extension',
        extensionVersion: '1.0.0',
      });

    expect(postRes.status).toBe(201);
    expect(postRes.headers['access-control-allow-origin']).toBe(extensionOrigin);
    expect(postRes.body.pairingCode).toMatch(/^SS-[A-Z0-9]{4}$/);
  });
});

