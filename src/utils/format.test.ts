import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateTime, parseTimestamp } from './format';

test('parseTimestamp treats SQLite datetime as UTC', () => {
  const date = parseTimestamp('2026-07-15 10:00:00');
  assert.equal(date.toISOString(), '2026-07-15T10:00:00.000Z');
});

test('formatDateTime shows WIB from UTC SQLite stamp', () => {
  // 10:00 UTC = 17:00 WIB
  const text = formatDateTime('2026-07-15 10:00:00');
  assert.match(text, /17\.00\.00 WIB|17:00:00 WIB/);
});

test('parseTimestamp keeps ISO with Z', () => {
  const date = parseTimestamp('2026-07-15T10:00:00.000Z');
  assert.equal(date.toISOString(), '2026-07-15T10:00:00.000Z');
});
