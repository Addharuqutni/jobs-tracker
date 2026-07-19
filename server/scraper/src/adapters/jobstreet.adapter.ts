import type { AdapterResult, AdapterConfig, ScrapedJob, JobSource } from '../../../shared/src';
import { BaseAdapter } from './base';
import { extractWindowVar } from '../utils/json-extract';
import { buildJobStreetUrl } from '../utils/url';
import * as cheerio from 'cheerio';

interface ApolloData {
  ROOT_QUERY?: Record<string, unknown>;
  [key: string]: unknown;
}

interface JobSearchV6Data {
  id: string;
  title: string;
  companyName: string | null;
  locations: Array<{ label: string }>;
  salaryLabel: string | null;
  advertiser?: { description: string | null };
  listingDate?: { dateTimeUtc?: string };
}

type ApolloJob = JobSearchV6Data & { __typename?: string };

export class JobStreetAdapter extends BaseAdapter {
  source = 'jobstreet' as const;
  baseUrl = 'https://id.jobstreet.com';
  config: AdapterConfig = {
    maxPages: 5,
    delayMinMs: 2000,
    delayMaxMs: 5000,
    timeoutMs: 15000,
  };

  async scrape(keyword: string = 'programmer'): Promise<AdapterResult> {
    try {
      const allJobs: ScrapedJob[] = [];

      for (let page = 1; page <= this.config.maxPages; page++) {
        const url = buildJobStreetUrl(keyword, page);
        const html = await this.fetchHtml(url, 'article[data-automation="normalJob"]');
        const jobs = this.parseFixture(html);

        if (page === 1 && jobs.length === 0 && this.hasJobCards(html)) {
          throw new Error('JobStreet parser mismatch: job cards found but no jobs parsed');
        }
        if (jobs.length === 0) break;
        allJobs.push(...jobs);

        if (page < this.config.maxPages) {
          await this.delay();
        }
      }

      return this.success(allJobs);
    } catch (err) {
      return this.error(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  parseFixture(html: string): ScrapedJob[] {
    const apolloData = extractWindowVar(html, 'SEEK_APOLLO_DATA') as ApolloData | null;
    if (apolloData) {
      const jobs = this.parseApolloData(apolloData);
      if (jobs.length > 0) return jobs;
    }
    return this.parseDom(html);
  }

  private hasJobCards(html: string): boolean {
    return cheerio.load(html)('article[data-automation="normalJob"]').length > 0;
  }

  private parseApolloData(data: ApolloData): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];

    for (const value of Object.values(data)) {
      if (!value || typeof value !== 'object' || !('__typename' in value)) continue;
      const typed = value as ApolloJob;

      if (typed.__typename === 'JobSearchV6Data') {
        if (!typed.id || !this.isWithinLastWeek(typed.listingDate?.dateTimeUtc)) continue;
        jobs.push(this.mapApolloJob(typed));
        continue;
      }

      if (typed.__typename === 'SearchV6Result') {
        const result = typed as unknown as { data?: Array<{ __ref?: string }> };
        if (!result.data) continue;
        for (const ref of result.data) {
          if (!ref.__ref) continue;
          const jobEntity = data[ref.__ref] as JobSearchV6Data | undefined;
          if (!jobEntity || !jobEntity.id) continue;
          if (!this.isWithinLastWeek(jobEntity.listingDate?.dateTimeUtc)) continue;
          jobs.push(this.mapApolloJob(jobEntity));
        }
      }
    }

    return jobs;
  }

  private mapApolloJob(jobEntity: JobSearchV6Data): ScrapedJob {
    return {
      title: jobEntity.title ?? null,
      company: jobEntity.companyName ?? jobEntity.advertiser?.description ?? null,
      location: jobEntity.locations?.[0]?.label ?? null,
      url: `${this.baseUrl}/id/job/${jobEntity.id}`,
      salary: jobEntity.salaryLabel ?? null,
      source: 'jobstreet' as JobSource,
      jobId: jobEntity.id,
      postedAt: jobEntity.listingDate?.dateTimeUtc ?? null,
    };
  }

  private parseDom(html: string): ScrapedJob[] {
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];

    $('article[data-automation="normalJob"]').each((_, el) => {
      const $card = $(el);
      const title = $card.find('a[data-automation="jobTitle"]').text().trim();
      const company = $card.find('a[data-automation="jobCompany"]').text().trim();
      const location = $card.find('a[data-automation="jobLocation"]').text().trim();
      const salary = $card.find('[data-automation="jobSalary"] span').text().trim();
      const href = $card.find('a[data-automation="jobTitle"]').attr('href');
      const jobId = $card.attr('data-job-id');
      const postedAt = $card.find('time').attr('datetime') ?? null;

      if (!title) return;

      jobs.push({
        title: title || null,
        company: company || null,
        location: location || null,
        url: href ? `${this.baseUrl}${href}` : null,
        salary: salary || null,
        source: 'jobstreet' as JobSource,
        jobId: jobId ?? null,
        postedAt,
      });
    });

    return jobs;
  }
}
