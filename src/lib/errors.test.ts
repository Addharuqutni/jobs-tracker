import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClientError, getUserMessage } from './errors';

test('getUserMessage maps known API codes', () => {
  assert.equal(
    getUserMessage(new ApiClientError('QUEUE_FULL', 'raw queue msg')),
    'Scraper queue is full. Wait and try again.',
  );
  assert.equal(
    getUserMessage(new ApiClientError('NETWORK_ERROR', 'Cannot reach')),
    'Cannot reach the server. Is the API running?',
  );
});

test('getUserMessage falls back for unknown Error', () => {
  assert.equal(getUserMessage(new Error('boom')), 'boom');
  assert.equal(getUserMessage('x'), 'Something went wrong. Try again.');
});
