import assert from 'node:assert/strict';
import test from 'node:test';
import { isRecentListingDate } from '../src/adapters/base';

test('freshness accepts missing and recent dates', () => {
  assert.equal(isRecentListingDate(undefined), true);
  assert.equal(isRecentListingDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()), true);
});

test('freshness rejects stale and future dates', () => {
  assert.equal(isRecentListingDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()), false);
  assert.equal(isRecentListingDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()), false);
});
