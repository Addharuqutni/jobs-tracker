import assert from 'node:assert/strict';
import test from 'node:test';

import { dedupEngine, canonicalUrl } from './core/dedup';
import { buildJobStreetUrl, buildLinkedInUrl } from './utils/url';
import { chooseTool, parsePayload } from './sidecar/python-sidecar';
import { withTimeout, TimeoutError } from './utils/timeout';

test('JobStreet URL safely encodes keywords', () => {
  const url = buildJobStreetUrl('  C++ Developer  ', 2);

  assert.equal(url, 'https://id.jobstreet.com/id/c%2B%2B-developer-jobs?page=2');
});

test('LinkedIn URL uses guest pagination and Indonesia geo ID', () => {
  const url = buildLinkedInUrl('react developer', 20);

  assert.match(url, /jobs-guest\/jobs\/api\/seeMoreJobPostings\/search/);
  assert.match(url, /geoId=102478259/);
  assert.match(url, /start=20/);
});

test('similarity ignores missing optional locations', () => {
  const score = dedupEngine.calculateSimilarity(
    { title: 'Frontend Developer', company: 'Acme', location: null },
    { title: 'Frontend Developer', company: 'Acme', location: null },
  );

  assert.equal(score, 1);
});

test('scraper package can be imported without executing CLI', async () => {
  const scraper = await import('./index');

  assert.equal(typeof scraper.Orchestrator, 'function');
  assert.equal(scraper.orchestrator.getRunning(), false);
});

test('chooseTool auto selects beautifulsoup for linkedin', () => {
  assert.equal(chooseTool('linkedin', 'auto'), 'beautifulsoup');
});

test('chooseTool auto selects playwright for jobstreet', () => {
  assert.equal(chooseTool('jobstreet', 'auto'), 'playwright');
});

test('chooseTool respects explicit tool override', () => {
  assert.equal(chooseTool('linkedin', 'selenium'), 'selenium');
});

test('parsePayload validates and filters jobs', () => {
  const raw = JSON.stringify({
    tool: 'beautifulsoup',
    source: 'linkedin',
    status: 'success',
    jobs: [
      {
        title: 'Dev',
        company: 'Co',
        location: 'Jakarta',
        url: 'https://www.linkedin.com/jobs/view/1',
        salary: null,
        source: 'linkedin',
        jobId: '1',
      },
      {
        title: 'Bad',
        company: null,
        location: null,
        url: 'not-a-url',
        salary: null,
        source: 'linkedin',
        jobId: '2',
      },
    ],
    metrics: { valid: 1, unique: 1, completeness: 1 },
    error: null,
  });

  const payload = parsePayload(raw, 'linkedin', 'beautifulsoup');

  assert.equal(payload.status, 'success');
  assert.equal(payload.jobs.length, 1);
  assert.equal(payload.jobs[0]?.title, 'Dev');
});

test('parsePayload rejects contract mismatch', () => {
  const raw = JSON.stringify({
    tool: 'selenium',
    source: 'linkedin',
    status: 'success',
    jobs: [],
    metrics: { valid: 0, unique: 0, completeness: 0 },
    error: null,
  });

  assert.throws(() => parsePayload(raw, 'linkedin', 'beautifulsoup'), /contract mismatch/);
});

test('parsePayload surfaces sidecar error status', () => {
  const raw = JSON.stringify({
    tool: 'beautifulsoup',
    source: 'linkedin',
    status: 'error',
    jobs: [],
    metrics: { valid: 0, unique: 0, completeness: 0 },
    error: 'robots.txt disallows',
  });

  const payload = parsePayload(raw, 'linkedin', 'beautifulsoup');

  assert.equal(payload.status, 'error');
  assert.equal(payload.error, 'robots.txt disallows');
});

// --- canonical URL tests ---

test('canonicalUrl strips query string', () => {
  assert.equal(
    canonicalUrl('https://example.com/job/123?ref=google'),
    'https://example.com/job/123',
  );
});

test('canonicalUrl strips hash fragment', () => {
  assert.equal(canonicalUrl('https://example.com/job/123#apply'), 'https://example.com/job/123');
});

test('canonicalUrl strips trailing slash', () => {
  assert.equal(canonicalUrl('https://example.com/job/123/'), 'https://example.com/job/123');
});

test('canonicalUrl normalizes casing', () => {
  assert.equal(
    canonicalUrl('https://Example.COM/Job/123'),
    canonicalUrl('https://example.com/job/123'),
  );
});

test('canonicalUrl handles invalid URL gracefully', () => {
  assert.equal(canonicalUrl('not-a-url/'), 'not-a-url');
});

// --- sidecar non-empty invalid payload test ---

test('parsePayload rejects success with all-invalid non-empty jobs', () => {
  const raw = JSON.stringify({
    tool: 'beautifulsoup',
    source: 'linkedin',
    status: 'success',
    jobs: [
      {
        title: 'Bad',
        company: null,
        location: null,
        url: 'not-a-url',
        salary: null,
        source: 'linkedin',
        jobId: '1',
      },
      {
        title: 'Bad2',
        company: null,
        location: null,
        url: 'http://wrong-scheme',
        salary: null,
        source: 'linkedin',
        jobId: '2',
      },
    ],
    metrics: { valid: 0, unique: 0, completeness: 0 },
    error: null,
  });

  assert.throws(() => parsePayload(raw, 'linkedin', 'beautifulsoup'), /contract mismatch.*0 valid/);
});

test('parsePayload accepts genuinely empty success payload', () => {
  const raw = JSON.stringify({
    tool: 'beautifulsoup',
    source: 'linkedin',
    status: 'success',
    jobs: [],
    metrics: { valid: 0, unique: 0, completeness: 0 },
    error: null,
  });

  const payload = parsePayload(raw, 'linkedin', 'beautifulsoup');

  assert.equal(payload.status, 'success');
  assert.equal(payload.jobs.length, 0);
});

// --- timeout guard: a hung async step must not stall the caller (scraper stuck fix) ---

test('withTimeout rejects when the wrapped promise never resolves', async () => {
  const neverResolves = new Promise<void>(() => {});

  await assert.rejects(
    () => withTimeout(neverResolves, 20, 'hang'),
    (err: unknown) => err instanceof TimeoutError && /hang timed out after 20ms/.test(err.message),
  );
});

test('withTimeout passes through a value that resolves in time', async () => {
  const value = await withTimeout(Promise.resolve(42), 1000, 'fast');

  assert.equal(value, 42);
});
