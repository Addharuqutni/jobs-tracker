import assert from 'node:assert/strict';
import test from 'node:test';
import { optionalQueryString, parseDate, parseJobSource, parsePositiveId, parseSort, parseStatuses, validateDateRange } from './validation';

test('validates application status lists', () => {
  assert.deepEqual(parseStatuses('wishlist,applied'), ['wishlist', 'applied']);
  assert.throws(() => parseStatuses('wishlist,unknown'), /invalid status/);
  assert.throws(() => parseStatuses(''), /comma-separated/);
});

test('validates sources and scalar query strings', () => {
  assert.equal(parseJobSource('dealls'), 'dealls');
  assert.throws(() => parseJobSource('deals'), /must be one of/);
  assert.equal(optionalQueryString('react', 'keyword'), 'react');
  assert.throws(() => optionalQueryString(['react'], 'keyword'), /must be a string/);
});

test('accepts only complete positive integer IDs', () => {
  assert.equal(parsePositiveId('42'), 42);
  assert.equal(parsePositiveId('1abc'), undefined);
  assert.equal(parsePositiveId('0'), undefined);
  assert.equal(parsePositiveId('-1'), undefined);
});

test('accepts only supported job sorting', () => {
  assert.equal(parseSort('company'), 'company');
  assert.equal(parseSort(undefined), 'newest');
  assert.throws(() => parseSort('salary'), /sort must be one of/);
});

test('validates ISO date-only ranges', () => {
  assert.equal(parseDate('2026-07-12', 'from'), '2026-07-12');
  assert.throws(() => parseDate('12-07-2026', 'from'), /YYYY-MM-DD/);
  assert.throws(() => parseDate('2026-02-30', 'from'), /YYYY-MM-DD/);
  assert.throws(() => validateDateRange('2026-07-13', '2026-07-12'), /must not be later/);
});
