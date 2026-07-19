import assert from 'node:assert/strict';
import test from 'node:test';
import { ScraperQueue } from './queue';
import type { ScraperRunResult } from '../../shared/src';

function fakeResult(tag: string): ScraperRunResult {
  return {
    finishedAt: new Date().toISOString(),
    jobs: [
      {
        title: tag,
        company: 'Co',
        location: null,
        url: `https://example.com/${tag}`,
        salary: null,
        source: 'jobstreet',
        jobId: tag,
        postedAt: null,
      },
    ],
    logs: [
      {
        source: 'jobstreet',
        status: 'success',
        errorMessage: null,
        jobsScrapedCount: 1,
        timestamp: new Date().toISOString(),
      },
    ],
    portals: [
      {
        source: 'jobstreet',
        lastStatus: 'success',
        lastRun: new Date().toISOString(),
        jobsScraped: 1,
        errorMessage: null,
      },
    ],
  };
}

function mockOrchestrator(delayMs = 30) {
  let running = false;
  return {
    getRunning: () => running,
    async run(sources?: string[]) {
      running = true;
      await new Promise((r) => setTimeout(r, delayMs));
      running = false;
      return fakeResult((sources ?? ['all']).join('-') || 'all');
    },
  };
}

test('queue runs jobs serially with concurrency 1', async () => {
  process.env.SCRAPER_CONCURRENCY = '1';
  process.env.SCRAPER_QUEUE_MAX = '10';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queue = new ScraperQueue(mockOrchestrator(40) as any);

  const a = queue.enqueue({ sources: ['jobstreet'] });
  const b = queue.enqueue({ sources: ['linkedin'] });
  assert.ok(!('error' in a));
  assert.ok(!('error' in b));
  // pump promotes first job immediately
  assert.ok(a.job.status === 'queued' || a.job.status === 'running');
  assert.equal(b.job.status, 'queued');
  assert.equal(b.job.position, 1);

  await new Promise((r) => setTimeout(r, 15));
  const aMid = queue.getRun(a.job.runId);
  const bMid = queue.getRun(b.job.runId);
  assert.equal(aMid?.status, 'running');
  assert.equal(bMid?.status, 'queued');

  await new Promise((r) => setTimeout(r, 120));
  const aDone = queue.getRun(a.job.runId);
  const bDone = queue.getRun(b.job.runId);
  assert.equal(aDone?.status, 'succeeded');
  assert.equal(bDone?.status, 'succeeded');
  assert.equal(aDone?.result?.jobs[0]?.jobId, 'jobstreet');
  assert.equal(bDone?.result?.jobs[0]?.jobId, 'linkedin');
});

test('queue returns QUEUE_FULL when over max', () => {
  process.env.SCRAPER_CONCURRENCY = '1';
  process.env.SCRAPER_QUEUE_MAX = '2';
  // hang first job so queue fills
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queue = new ScraperQueue(mockOrchestrator(10_000) as any);

  assert.ok(!('error' in queue.enqueue({})));
  assert.ok(!('error' in queue.enqueue({})));
  // first may be running, second queued — third should fill at max 2 queued... 
  // actually: first moves to active, queue has 1, second queues (len 1), third queues (len 2), fourth full
  const third = queue.enqueue({});
  if ('error' in third) {
    assert.equal(third.error, 'QUEUE_FULL');
  } else {
    const fourth = queue.enqueue({});
    assert.ok('error' in fourth);
    if ('error' in fourth) assert.equal(fourth.error, 'QUEUE_FULL');
  }
});
