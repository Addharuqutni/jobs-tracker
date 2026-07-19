import type { ScrapedJob } from '../../../shared/src';
import { fuzzyMatch } from '../../../shared/src';

export const dedupEngine = {
  async filter(jobs: ScrapedJob[]): Promise<ScrapedJob[]> {
    const unique: ScrapedJob[] = [];
    const seenInBatch = new Set<string>();

    for (const job of jobs) {
      const batchKey = job.jobId
        ? `${job.source}:${job.jobId}`
        : job.url
          ? canonicalUrl(job.url)
          : '';
      if (!batchKey) continue;
      if (seenInBatch.has(batchKey)) continue;
      seenInBatch.add(batchKey);

      if (job.title && job.company) {
        if (unique.some((accepted) => this.calculateSimilarity(job, accepted) >= 0.9)) continue;
      }

      unique.push(job);
    }

    return unique;
  },

  calculateSimilarity(
    a: { title: string | null; company: string | null; location: string | null },
    b: { title: string | null; company: string | null; location: string | null },
  ): number {
    const fields = [
      [a.title, b.title, 0.6],
      [a.company, b.company, 0.3],
      [a.location, b.location, 0.1],
    ] as const;
    const present = fields.filter(([left, right]) => left && right);
    const weight = present.reduce((sum, field) => sum + field[2], 0);
    return weight === 0
      ? 0
      : present.reduce(
          (sum, [left, right, fieldWeight]) =>
            sum + fuzzyMatch(left ?? '', right ?? '') * fieldWeight,
          0,
        ) / weight;
  },
};

export function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, '').toLowerCase();
  }
}
