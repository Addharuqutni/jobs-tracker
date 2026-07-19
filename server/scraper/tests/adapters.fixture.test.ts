import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DeallsAdapter } from '../src/adapters/dealls.adapter';
import { GlintsAdapter } from '../src/adapters/glints.adapter';
import { JobStreetAdapter } from '../src/adapters/jobstreet.adapter';
import { KalibrrAdapter } from '../src/adapters/kalibrr.adapter';
import { LinkedInAdapter } from '../src/adapters/linkedin.adapter';

async function fixture(name: string): Promise<string> {
  return readFile(fileURLToPath(new URL(`./fixtures/${name}.html`, import.meta.url)), 'utf8');
}

test('JobStreet fixture maps DOM card fields', async () => {
  const jobs = new JobStreetAdapter().parseFixture(await fixture('jobstreet'));
  assert.deepEqual(jobs[0], {
    title: 'Frontend Engineer', company: 'Nusantara Tech', location: 'Jakarta',
    url: 'https://id.jobstreet.com/id/job/js-101', salary: 'Rp 15 juta', source: 'jobstreet', jobId: 'js-101',
    postedAt: '2026-07-10T08:00:00.000Z',
  });
});

test('JobStreet fixture prefers Apollo search data', async () => {
  const jobs = new JobStreetAdapter().parseFixture(await fixture('jobstreet-apollo'));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.jobId, 'js-102');
  assert.equal(jobs[0]?.title, 'Platform Engineer');
  assert.equal(jobs[0]?.company, 'Apollo Systems');
  assert.equal(jobs[0]?.source, 'jobstreet');
});

test('LinkedIn fixture maps guest card fields', async () => {
  const jobs = new LinkedInAdapter().parseFixture(await fixture('linkedin'));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.title, 'React Developer');
  assert.equal(jobs[0]?.jobId, '202');
  assert.equal(jobs[0]?.company, 'Example Labs');
  assert.equal(jobs[0]?.source, 'linkedin');
});

test('Kalibrr fixture maps Next data and salary', async () => {
  const jobs = new KalibrrAdapter().parseFixture(await fixture('kalibrr'));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.title, 'TypeScript Engineer');
  assert.equal(jobs[0]?.jobId, '303');
  assert.equal(jobs[0]?.source, 'kalibrr');
  assert.equal(jobs[0]?.salary, 'IDR 12000000 - 18000000 / month');
  assert.equal(jobs[0]?.location, 'Jakarta, DKI Jakarta');
});

test('Glints fixture maps bootstrap job', async () => {
  const jobs = new GlintsAdapter().parseFixture(await fixture('glints'));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.title, 'UI Engineer');
  assert.equal(jobs[0]?.jobId, 'gl-404');
  assert.equal(jobs[0]?.source, 'glints');
  assert.equal(jobs[0]?.url, 'https://glints.com/id/opportunities/jobs/ui-engineer/gl-404');
  assert.equal(jobs[0]?.salary, 'IDR 10000000 - 14000000');
  assert.equal(jobs[0]?.postedAt, '2026-07-01T08:00:00.000Z');
});

test('Dealls fixture validates and maps SSR jobs', async () => {
  const jobs = new DeallsAdapter().parseFixture(await fixture('dealls'));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.title, 'Backend Engineer');
  assert.equal(jobs[0]?.jobId, 'de-505');
  assert.equal(jobs[0]?.source, 'dealls');
  assert.equal(jobs[0]?.url, 'https://dealls.com/loker/backend-engineer~dealls-works');
  assert.equal(jobs[0]?.salary, 'Rp 13000000 - Rp 19000000');
});

test('all adapters return no jobs for empty fixture', () => {
  const adapters = [new JobStreetAdapter(), new LinkedInAdapter(), new KalibrrAdapter(), new GlintsAdapter(), new DeallsAdapter()];
  for (const adapter of adapters) assert.deepEqual(adapter.parseFixture('<html></html>'), []);
});
