import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Job } from '../../../shared/src';
import { buildCvReviewMessages, parseCvReviewResponse } from './cv-review-prompt';

const sampleJob: Job = {
  id: 7,
  title: 'Frontend Engineer',
  company: 'Acme',
  location: 'Jakarta',
  url: null,
  salary: null,
  source: 'jobstreet',
  jobId: 'abc',
  postedAt: null,
  scrapedAt: '2026-01-01',
  hidden: 0,
  createdAt: '2026-01-01',
};

describe('cv-review-prompt', () => {
  it('builds match prompt when job present', () => {
    const messages = buildCvReviewMessages('CV text', sampleJob);
    assert.equal(messages.length, 2);
    const userContent = messages[1]?.content ?? '';
    assert.match(userContent, /Frontend Engineer/);
    assert.match(userContent, /Acme/);
  });

  it('normalizes AI payload into CvReview', () => {
    const review = parseCvReviewResponse(
      {
        score: 82.4,
        summary: 'Solid frontend profile.',
        strengths: ['React depth', '  '],
        weaknesses: ['Missing tests'],
        suggestions: ['Add metrics'],
        matchScore: 70,
        keywordGaps: ['TypeScript'],
      },
      'match',
      sampleJob,
    );
    assert.equal(review.score, 82);
    assert.equal(review.mode, 'match');
    assert.deepEqual(review.strengths, ['React depth']);
    assert.equal(review.match?.jobId, 7);
    assert.equal(review.match?.matchScore, 70);
    assert.deepEqual(review.match?.keywordGaps, ['TypeScript']);
  });

  it('general mode clears match', () => {
    const review = parseCvReviewResponse(
      { score: 50, summary: 'ok', strengths: [], weaknesses: [], suggestions: [], matchScore: 90, keywordGaps: ['x'] },
      'general',
      null,
    );
    assert.equal(review.match, null);
  });
});
