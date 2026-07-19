import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFunnel } from './analytics-calculation';

test('funnel counts progressed applications cumulatively', () => {
  const funnel = calculateFunnel([
    { status: 'wishlist', appliedAt: null },
    { status: 'applied', appliedAt: '2026-07-01' },
    { status: 'interview', appliedAt: '2026-07-02' },
    { status: 'offered', appliedAt: '2026-07-03' },
    { status: 'rejected', appliedAt: '2026-07-04' },
  ]);

  assert.deepEqual(funnel, { applied: 4, interview: 2, offered: 1 });
});
