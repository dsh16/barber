import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('liveness returns ok', async () => {
  const response = await request(createApp(async () => {})).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
});
test('readiness checks database', async () => {
  let checked = false;
  const response = await request(createApp(async () => { checked = true; })).get('/api/ready').expect(200);
  assert.equal(checked, true);
  assert.equal(response.body.database, 'connected');
});
test('database failure returns 503 without exposing details', async () => {
  const response = await request(createApp(async () => { throw new Error('private connection details'); }))
    .get('/api/ready').expect(503);
  assert.deepEqual(response.body, { status: 'error', database: 'unavailable' });
});
