import type { AdapterResult, AdapterConfig, ScrapedJob, JobSource } from '../../../shared/src';
import { BaseAdapter } from './base';
import { extractNextData } from '../utils/json-extract';
import { fetchPage } from '../utils/http';

interface DeallsJob {
  id: string;
  role: string;
  slug: string;
  salaryType: string;
  salaryRange: { start: number; end: number } | null;
  city: { name: string } | null;
  country: { name: string } | null;
  company: { name: string; slug: string } | null;
  publishedAt?: string;
}

interface DeallsNextData {
  props?: {
    pageProps?: {
      dehydratedState?: {
        queries?: Array<{
          state?: {
            data?: {
              pages?: Array<{ docs?: DeallsJob[] }>;
            };
          };
        }>;
      };
    };
  };
}

export class DeallsAdapter extends BaseAdapter {
  source = 'dealls' as const;
  baseUrl = 'https://dealls.com';
  config: AdapterConfig = {
    maxPages: 5,
    delayMinMs: 1000,
    delayMaxMs: 3000,
    timeoutMs: 15000,
  };

  async scrape(keyword?: string): Promise<AdapterResult> {
    try {
      const allJobs: ScrapedJob[] = [];
      const seenIds = new Set<string>();

      for (let page = 1; page <= this.config.maxPages; page++) {
        const url = `${this.baseUrl}/?page=${page}`;
        const { jobs, rawDocCount } = await this.scrapeFromSsr(url);

        if (page === 1 && jobs.length === 0 && rawDocCount > 0) {
          throw new Error('Dealls parser mismatch: __NEXT_DATA__ contains jobs but none parsed');
        }
        if (jobs.length === 0) break;
        if (jobs.some((job) => job.jobId !== null && seenIds.has(job.jobId))) break;
        for (const job of jobs) {
          if (job.jobId !== null && !seenIds.has(job.jobId)) {
            seenIds.add(job.jobId);
            allJobs.push(job);
          }
        }

        if (page < this.config.maxPages) {
          await this.delay();
        }
      }

      const normalizedKeywords =
        keyword
          ?.split('\u0000')
          .map((value) => value.trim().toLocaleLowerCase())
          .filter(Boolean) ?? [];
      const filtered =
        normalizedKeywords.length > 0
          ? allJobs.filter((job) => {
              const haystack = `${job.title ?? ''} ${job.company ?? ''}`.toLocaleLowerCase();
              return normalizedKeywords.some((value) => haystack.includes(value));
            })
          : allJobs;
      return this.success(filtered);
    } catch (err) {
      return this.error(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  private async scrapeFromSsr(url: string): Promise<{ jobs: ScrapedJob[]; rawDocCount: number }> {
    const html = await fetchPage(url, this.config.timeoutMs);
    const jobs = this.parseFixture(html);
    const data = extractNextData(html) as DeallsNextData | null;
    const queries = data?.props?.pageProps?.dehydratedState?.queries ?? [];
    const rawDocCount = queries.find((query) => query.state?.data?.pages?.[0]?.docs)?.state?.data?.pages?.[0]?.docs?.length ?? 0;
    return { jobs, rawDocCount };
  }

  parseFixture(html: string): ScrapedJob[] {
    const data = extractNextData(html) as DeallsNextData | null;

    // Find the query that has job data (pages[].docs[])
    const queries = data?.props?.pageProps?.dehydratedState?.queries ?? [];
    for (const query of queries) {
      const docs = query.state?.data?.pages?.[0]?.docs;
      if (docs && docs.length > 0) {
        const jobs = docs
          .filter((job) => this.isValidJob(job) && this.isWithinLastWeek(job.publishedAt))
          .map((job) => this.mapJob(job));
        return jobs;
      }
    }

    return [];
  }

  private isValidJob(job: DeallsJob): boolean {
    return (
      typeof job.id === 'string' &&
      job.id.trim() !== '' &&
      typeof job.role === 'string' &&
      job.role.trim() !== '' &&
      typeof job.slug === 'string' &&
      job.slug.trim() !== '' &&
      typeof job.company?.name === 'string' &&
      job.company.name.trim() !== '' &&
      typeof job.company.slug === 'string' &&
      job.company.slug.trim() !== ''
    );
  }

  private mapJob(job: DeallsJob): ScrapedJob {
    const location = [job.city?.name, job.country?.name].filter(Boolean).join(', ') || null;

    let salary: string | null = null;
    if (job.salaryType === 'paid' && job.salaryRange) {
      salary = `Rp ${job.salaryRange.start} - Rp ${job.salaryRange.end}`;
    }

    return {
      title: job.role || null,
      company: job.company?.name ?? null,
      location,
      url: `${this.baseUrl}/loker/${job.slug}~${job.company?.slug ?? ''}`,
      salary,
      source: 'dealls' as JobSource,
      jobId: job.id,
      postedAt: job.publishedAt ?? null,
    };
  }
}
