import type { AdapterResult, AdapterConfig, ScrapedJob, JobSource } from '../../../shared/src';
import { BaseAdapter } from './base';
import { extractNextData } from '../utils/json-extract';
import { buildKalibrrUrl } from '../utils/url';
import { newPage, closePage } from '../utils/puppeteer-pool';
import { withTimeout } from '../utils/timeout';

interface KalibrrJob {
  id: number;
  name: string;
  slug: string;
  company: { name: string; code: string };
  googleLocation?: {
    addressComponents?: { city?: string; region?: string };
  };
  baseSalary?: number | null;
  maximumSalary?: number | null;
  salaryInterval?: string | null;
  salaryShown?: boolean;
  salaryCurrency?: string | null;
  activationDate?: string;
}

interface NextData {
  props?: {
    pageProps?: {
      jobs?: KalibrrJob[];
    };
  };
}

export class KalibrrAdapter extends BaseAdapter {
  source = 'kalibrr' as const;
  baseUrl = 'https://www.kalibrr.com';
  config: AdapterConfig = {
    maxPages: 5,
    delayMinMs: 1500,
    delayMaxMs: 3000,
    timeoutMs: 15000,
  };

  async scrape(keyword: string = 'programmer'): Promise<AdapterResult> {
    const allJobs: ScrapedJob[] = [];
    const seen = new Set<string>();
    const add = (jobs: ScrapedJob[]): number => {
      let added = 0;
      for (const job of jobs) {
        if (!job.jobId || seen.has(job.jobId)) continue;
        seen.add(job.jobId);
        allJobs.push(job);
        added++;
      }
      return added;
    };

    try {
      const url = buildKalibrrUrl(keyword);
      const html = await this.fetchHtml(url);
      const parsed = this.parseFixture(html);
      if (parsed.length === 0 && this.hasJobData(html)) {
        throw new Error('Kalibrr parser mismatch: __NEXT_DATA__ contains jobs but none parsed');
      }
      add(parsed);

      if (this.config.maxPages > 1) {
        try {
          add(await this.scrapeWithPuppeteer(url, this.config.maxPages - 1, seen));
        } catch (err) {
          return {
            ...this.success(allJobs),
            status: 'error',
            errorMessage: err instanceof Error ? err.message : 'Kalibrr pagination failed',
          };
        }
      }

      return this.success(allJobs);
    } catch (err) {
      return this.error(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  parseFixture(html: string): ScrapedJob[] {
    const data = extractNextData(html) as NextData | null;
    if (!data?.props?.pageProps?.jobs) return [];

    return data.props.pageProps.jobs
      .filter((job) => this.isWithinLastWeek(job.activationDate))
      .map((job) => this.mapJob(job));
  }

  private hasJobData(html: string): boolean {
    const data = extractNextData(html) as NextData | null;
    const jobs = data?.props?.pageProps?.jobs;
    return Array.isArray(jobs) && jobs.length > 0;
  }

  private mapJob(job: KalibrrJob): ScrapedJob {
    const loc = job.googleLocation?.addressComponents;
    const location = [loc?.city, loc?.region].filter(Boolean).join(', ') || null;

    let salary: string | null = null;
    if (job.salaryShown && (job.baseSalary != null || job.maximumSalary != null)) {
      const range = [job.baseSalary, job.maximumSalary]
        .filter((value) => value != null)
        .join(' - ');
      salary = `${job.salaryCurrency ?? 'IDR'} ${range} / ${job.salaryInterval ?? 'month'}`;
    }

    return {
      title: job.name || null,
      company: job.company?.name ?? null,
      location,
      url: `${this.baseUrl}/c/${job.company?.code}/jobs/${job.id}/${job.slug}`,
      salary,
      source: 'kalibrr' as JobSource,
      jobId: String(job.id),
      postedAt: job.activationDate ?? null,
    };
  }

  private async scrapeWithPuppeteer(
    url: string,
    additionalPages: number,
    seen: Set<string>,
  ): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const discovered = new Set(seen);
    const page = await newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeoutMs });
      await page.waitForSelector('a[href*="/jobs/"]', { timeout: 10000 });

      for (let i = 0; i < additionalPages; i++) {
        // ponytail: page.evaluate runs in browser context; use string to avoid DOM lib requirement in API
        const loadMoreScript = `(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent && btn.textContent.includes('Load more')) {
              btn.click();
              return true;
            }
          }
          return false;
        })()`;
        const loadMoreClicked = (await withTimeout(
          page.evaluate(loadMoreScript),
          this.config.timeoutMs,
          'kalibrr.loadMore.evaluate',
        )) as boolean;

        if (!loadMoreClicked) break;

        const previousCount = seen.size;
        await page.waitForFunction(
          (count) =>
            new Set(
              Array.from(document.querySelectorAll('a[href*="/jobs/"]')).map((link) =>
                link.getAttribute('href'),
              ),
            ).size > count,
          { timeout: this.config.timeoutMs },
          previousCount,
        );

        const rendered = await withTimeout(
          page.evaluate(() =>
            Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/"]'))
              .map((link) => {
                const match = link.href.match(/\/jobs\/(\d+)\/([^/?#]+)/);
                const card = link.closest('article') ?? link.parentElement?.parentElement;
                const text = card?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
                const timeEl = card?.querySelector('time');
                const postedAt = timeEl?.getAttribute('datetime') ?? null;
                return match?.[1]
                  ? { id: match[1], href: link.href, title: link.textContent?.trim() || null, text, postedAt }
                  : null;
              })
              .filter((job): job is NonNullable<typeof job> => job !== null),
          ),
          this.config.timeoutMs,
          'kalibrr.render.evaluate',
        );
        let added = 0;
        for (const job of rendered) {
          if (discovered.has(job.id)) continue;
          discovered.add(job.id);
          jobs.push({
            title: job.title,
            company: null,
            location: null,
            url: job.href,
            salary: null,
            source: this.source,
            jobId: job.id,
            postedAt: job.postedAt,
          });
          added++;
        }
        if (added === 0) break;

        await this.delay();
      }
    } finally {
      await closePage(page);
    }

    return jobs;
  }
}
