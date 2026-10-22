import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

const url = process.env.TEST_DATABASE_URL;
test('booking API against PostgreSQL', { skip: !url }, async (t) => {
  if (!url || !new URL(url).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point to a dedicated database ending in _test');
  }
  process.env.DATABASE_URL = url;
  const { sequelize } = await import('../src/db.js');
  const { migrations } = await import('../src/migrations.js');
  const { Umzug, SequelizeStorage } = await import('umzug');
  const { createApp } = await import('../src/app.js');
  const ids: string[] = [];
  t.after(async () => {
    try {
      if (ids.length) await sequelize.query('DELETE FROM bookings WHERE "requestId" IN (:ids)', { replacements: { ids } });
    } finally { await sequelize.close(); }
  });
  const migrator = new Umzug({ migrations, context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }), logger: undefined });
  await migrator.up();
  await migrator.up(); // Repeat migrations without changing existing data.
  const app = createApp(() => sequelize.authenticate());
  const makeInput = (masterId: number | null = null) => {
    const requestId = randomUUID(); ids.push(requestId);
    return { requestId, masterId, serviceId: 1, name: 'Тестовый клиент', phone: '+79991234567' };
  };
  await t.test('catalog exposes masters and services', async () => {
    const response = await request(app).get('/api/catalog').expect(200);
    assert.ok(response.body.masters.length > 0);
    assert.ok(response.body.services[0].durationMinutes > 0);
  });
  await t.test('selected master and any-master bookings persist contact details', async () => {
    for (const masterId of [1, null]) {
      const input = makeInput(masterId);
      const response = await request(app).post('/api/bookings').send(input).expect(201);
      assert.ok(Number.isInteger(response.body.queueNumber));
      assert.deepEqual(Object.keys(response.body), ['queueNumber']);
      const [rows] = await sequelize.query('SELECT * FROM bookings WHERE "requestId" = :id', { replacements: { id: input.requestId } });
      const saved = rows[0] as Record<string, unknown>;
      assert.equal(saved.masterId, masterId);
      assert.equal(saved.name, input.name);
      assert.equal(saved.phone, input.phone);
      assert.equal(saved.serviceId, 1);
    }
  });
  await t.test('parallel requests have unique numbers', async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, () =>
      request(app).post('/api/bookings').send(makeInput()).expect(201)));
    assert.equal(new Set(responses.map(r => r.body.queueNumber)).size, 8);
  });
  await t.test('concurrent retries return a single ticket', async () => {
    const input = makeInput();
    const responses = await Promise.all(Array.from({ length: 5 }, () =>
      request(app).post('/api/bookings').send(input)));
    assert.equal(responses.filter(r => r.status === 201).length, 1);
    assert.equal(responses.filter(r => r.status === 200).length, 4);
    assert.equal(new Set(responses.map(r => r.body.queueNumber)).size, 1);
    await request(app).post('/api/bookings').send({ ...input, serviceId: 2 }).expect(409);
  });
  await t.test('invalid contacts or nonexistent catalog entries cannot create bookings', async () => {
    for (const patch of [{ phone: 'bad' }, { name: '' }, { masterId: 99999 }, { serviceId: 99999 }]) {
      await request(app).post('/api/bookings').send({ ...makeInput(), ...patch }).expect(400);
    }
  });
});
