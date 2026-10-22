import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseBooking, BookingError } from '../src/booking.js';

const valid = () => ({ requestId: randomUUID(), masterId: null, serviceId: 1,
  name: '  Иван  Петров ', phone: '8 (999) 123-45-67' });
test('normalizes contact details and accepts any master', () => {
  const result = parseBooking(valid());
  assert.equal(result.masterId, null);
  assert.equal(result.phone, '+79991234567');
  assert.equal(result.name, 'Иван Петров');
});
test('rejects missing selections and malformed contact details', () => {
  for (const patch of [
    { masterId: undefined }, { masterId: -1 }, { serviceId: '1' },
    { name: ' ' }, { name: '<script>' }, { name: 'A'.repeat(101) },
    { phone: '123' }, { phone: '+7callme9991234567' }, { requestId: 'invalid' },
  ]) {
    assert.throws(() => parseBooking({ ...valid(), ...patch }), BookingError);
  }
});
