import type { AdapterResult, AdapterConfig, ScrapedJob, JobSource } from '../../../shared/src';
import { BaseAdapter } from './base';
import { extractNextData } from '../utils/json-extract';
import { buildKalibrrUrl } from '../utils/url';
import { newPage, closePage } from '../utils/puppeteer-pool';

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
      console.log(`[scraper] kalibrr: native fetch start`);
      const html = await this.fetchHtml(url);
      const parsed = this.parseFixture(html);
      console.log(`[scraper] kalibrr: SSR jobs=${parsed.length}`);
      if (parsed.length === 0 && this.hasJobData(html)) {
        throw new Error('Kalibrr parser mismatch: __NEXT_DATA__ contains jobs but none parsed');
      }
      add(parsed);

      // ponytail: SSR __NEXT_DATA__ usually has enough jobs; only open Chrome when explicitly enabled
      // or when SSR returned nothing (page may be JS-rendered).
      const wantPagination =
        this.config.maxPages > 1 &&
        (process.env.KALIBRR_PAGINATE === '1' || allJobs.length === 0);

      if (wantPagination) {
        console.log(`[scraper] kalibrr: puppeteer pagination start`);
        try {
          add(await this.scrapeWithPuppeteer(url, this.config.maxPages - 1, seen));
        } catch (err) {
          console.warn(
            `[scraper] kalibrr: puppeteer pagination failed: ${err instanceof Error ? err.message : err}`,
          );
          return {
            ...this.success(allJobs),
            status: 'error',
            errorMessage: err instanceof Error ? err.message : 'Kalibrr pagination failed',
          };
        }
      } else {
        console.log(`[scraper] kalibrr: skip puppeteer (SSR ok)`);
      }

      console.log(`[scraper] kalibrr: done jobs=${allJobs.length}`);
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
      await page.waitForSelector('a[href*="/jobs/"]', { timeout: 10_000 });

      for (let i = 0; i < additionalPages; i++) {
        // count unique hrefs BEFORE clicking "Load more"
        const previousCount = (await page.evaluate(() =>
          new Set(
            Array.from(document.querySelectorAll('a[href*="/jobs/"]')).map((link) =>
              link.getAttribute('href'),
            ),
          ).size,
        )) as number;

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
        const loadMoreClicked = (await page.evaluate(loadMoreScript)) as boolean;
        if (!loadMoreClicked) {
          console.log(`[scraper] kalibrr: puppeteer page ${i + 1}/${additionalPages} no more button`);
          break;
        }

        try {
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
        } catch {
          console.warn(`[scraper] kalibrr: puppeteer page ${i + 1}/${additionalPages} wait timeout`);
          break;
        }

        const rendered = await page.evaluate(() =>
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
        console.log(
          `[scraper] kalibrr: puppeteer page ${i + 1}/${additionalPages} added=${added}`,
        );
        if (added === 0) break;

        await this.delay();
      }
    } finally {
      await closePage(page);
    }

    return jobs;
  }
}
