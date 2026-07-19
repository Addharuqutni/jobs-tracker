import type { AdapterResult, AdapterConfig, ScrapedJob, JobSource } from '../../../shared/src';
import { BaseAdapter } from './base';
import { buildLinkedInUrl } from '../utils/url';
import * as cheerio from 'cheerio';

export class LinkedInAdapter extends BaseAdapter {
  source = 'linkedin' as const;
  baseUrl = 'https://www.linkedin.com';
  config: AdapterConfig = {
    maxPages: 5,
    delayMinMs: 3000,
    delayMaxMs: 5000,
    timeoutMs: 15000,
  };

  async scrape(keyword: string = 'programmer'): Promise<AdapterResult> {
    try {
      const allJobs: ScrapedJob[] = [];
      const seen = new Set<string>();

      for (let page = 0; page < this.config.maxPages; page++) {
        const start = page * 10;
        const url = buildLinkedInUrl(keyword, start);
        const html = await this.fetchHtml(url, 'div.job-search-card');
        const jobs = this.parseFixture(html);

        if (page === 0 && jobs.length === 0 && this.hasJobCards(html)) {
          throw new Error('LinkedIn parser mismatch: job cards found but no jobs parsed');
        }
        if (jobs.length === 0) break;
        for (const job of jobs) {
          const key = job.jobId ?? job.url;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          allJobs.push(job);
        }

        if (page < this.config.maxPages - 1) {
          await this.delay();
        }
      }

      return this.success(allJobs);
    } catch (err) {
      return this.error(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  private hasJobCards(html: string): boolean {
    return cheerio.load(html)('div.job-search-card').length > 0;
  }

  parseFixture(html: string): ScrapedJob[] {
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];

    $('li')
      .has('div.job-search-card')
      .each((_, el) => {
        const $card = $(el);
        const title = $card.find('h3.base-search-card__title').text().trim();
        const company = $card
          .find('h4.base-search-card__subtitle a.hidden-nested-link')
          .text()
          .trim();
        const location = $card.find('span.job-search-card__location').text().trim();
        const entityUrn = $card.find('div.job-search-card').attr('data-entity-urn') ?? '';
        const jobIdMatch = entityUrn.match(/urn:li:jobPosting:(\d+)/);
        const jobId = jobIdMatch?.[1] ?? null;

        if (!title) return;

        const timeEl = $card.find(
          'time.job-search-card__listdate, time.job-search-card__listdate--new',
        );
        const postedDate = timeEl.attr('datetime') ?? null;
        if (!this.isWithinLastWeek(postedDate)) return;

        jobs.push({
          title: title || null,
          company: company || null,
          location: location || null,
          url: jobId ? `${this.baseUrl}/jobs/view/${jobId}` : null,
          salary: null,
          source: 'linkedin' as JobSource,
          jobId,
          postedAt: postedDate,
        });
      });

    return jobs;
  }
}
