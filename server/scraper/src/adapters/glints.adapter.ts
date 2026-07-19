import type { AdapterResult, AdapterConfig, ScrapedJob, JobSource } from '../../../shared/src';
import { BaseAdapter } from './base';
import { extractNextData } from '../utils/json-extract';
import { fetchJson } from '../utils/http';
import { newPage, closePage } from '../utils/puppeteer-pool';
import { withTimeout } from '../utils/timeout';

interface GlintsJobEntity {
  id: string;
  title: string;
  company?: { name?: string };
  location?: { formattedName?: string };
  salaries?: Array<{ minAmount?: number; maxAmount?: number; CurrencyCode?: string }>;
  shouldShowSalary?: boolean;
  workArrangementOption?: string;
  createdAt?: string;
}

interface GlintsGraphQLResponse {
  errors?: Array<{ message?: string }>;
  data?: {
    searchJobsV3?: {
      jobsInPage?: Array<{
        id: string;
        title: string;
        company?: { name: string };
        location?: { formattedName?: string };
        salaries?: Array<{ minAmount?: number; maxAmount?: number; CurrencyCode?: string }>;
        shouldShowSalary?: boolean;
        createdAt?: string;
      }>;
      hasMore?: boolean;
    };
  };
}

export class GlintsAdapter extends BaseAdapter {
  source = 'glints' as const;
  baseUrl = 'https://glints.com';
  config: AdapterConfig = {
    maxPages: 5,
    delayMinMs: 1500,
    delayMaxMs: 3000,
    timeoutMs: 15000,
  };

  async scrape(keyword: string = 'programmer'): Promise<AdapterResult> {
    const allJobs: ScrapedJob[] = [];
    const seen = new Set<string>();
    const add = (jobs: ScrapedJob[]): void => {
      for (const job of jobs) {
        if (!job.jobId || seen.has(job.jobId)) continue;
        seen.add(job.jobId);
        allJobs.push(job);
      }
    };

    try {
      const url = `${this.baseUrl}/id/opportunities/jobs/explore?country=ID&locationName=All%20Cities%2FProvinces&keyword=${encodeURIComponent(keyword)}`;
      const html = await this.fetchHtml(url);
      const bootstrap = this.parseFixtureData(html);
      if (bootstrap.jobs.length === 0 && this.hasJobData(html)) {
        throw new Error('Glints parser mismatch: bootstrap contains jobs but none parsed');
      }
      add(bootstrap.jobs);

      for (let page = 2; page <= this.config.maxPages; page++) {
        if (!bootstrap.hasMore) break;
        try {
          const result = await this.scrapeGraphQL(url, bootstrap.queryVariableData, page);
          add(result.jobs);
          if (!result.hasMore) break;
        } catch (err) {
          return {
            ...this.success(allJobs),
            status: 'error',
            errorMessage: err instanceof Error ? err.message : 'Glints pagination failed',
          };
        }
        await this.delay();
      }

      return this.success(allJobs);
    } catch (err) {
      return this.error(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  private parseFixtureData(html: string): {
    jobs: ScrapedJob[];
    hasMore: boolean;
    queryVariableData: Record<string, unknown>;
  } {
    const data = extractNextData(html) as {
      props?: {
        pageProps?: {
          initialJobs?: { jobsInPage?: GlintsJobEntity[]; hasMore?: boolean };
          queryVariableData?: Record<string, unknown>;
        };
      };
    } | null;
    const pageProps = data?.props?.pageProps;
    return {
      jobs: (pageProps?.initialJobs?.jobsInPage ?? []).map((job) => this.mapJob(job)),
      hasMore: pageProps?.initialJobs?.hasMore ?? false,
      queryVariableData: pageProps?.queryVariableData ?? {},
    };
  }

  parseFixture(html: string): ScrapedJob[] {
    return this.parseFixtureData(html).jobs;
  }

  private hasJobData(html: string): boolean {
    const data = extractNextData(html) as {
      props?: { pageProps?: { initialJobs?: { jobsInPage?: unknown[] } } };
    } | null;
    const jobs = data?.props?.pageProps?.initialJobs?.jobsInPage;
    return Array.isArray(jobs) && jobs.length > 0;
  }

  private async scrapeGraphQL(
    bootstrapUrl: string,
    queryVariableData: Record<string, unknown>,
    page: number,
  ): Promise<{ jobs: ScrapedJob[]; hasMore: boolean }> {
    const query = `
      query searchJobsV3($data: JobSearchConditionInput!) {
        searchJobsV3(data: $data) {
          jobsInPage {
            id
            title
            shouldShowSalary
            createdAt
            company { name }
            location { formattedName }
            salaries { minAmount maxAmount CurrencyCode }
          }
          hasMore
        }
      }
    `;

    const variables = {
      data: {
        ...queryVariableData,
        page,
        pageSize: 30,
      },
    };

    let response: GlintsGraphQLResponse;
    try {
      response = await fetchJson<GlintsGraphQLResponse>(
        `${this.baseUrl}/api/v2-alc/graphql?op=searchJobsV3`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Origin: this.baseUrl,
            Referer: bootstrapUrl,
          },
          body: JSON.stringify({ query, variables }),
        },
        this.config.timeoutMs,
      );
    } catch {
      const browserPage = await newPage();
      try {
        await browserPage.goto(bootstrapUrl, {
          waitUntil: 'domcontentloaded',
          timeout: this.config.timeoutMs,
        });
        response = await withTimeout(
          browserPage.evaluate(
            async ({ endpoint, payload }) => {
              const result = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: { accept: 'application/json', 'content-type': 'application/json' },
                body: payload,
              });
              if (!result.ok) throw new Error(`Glints GraphQL HTTP ${result.status}`);
              return result.json();
            },
            {
              endpoint: `${this.baseUrl}/api/v2-alc/graphql?op=searchJobsV3`,
              payload: JSON.stringify({ query, variables }),
            },
          ),
          this.config.timeoutMs,
          'glints.graphql.evaluate',
        );
      } finally {
        await closePage(browserPage);
      }
    }
    if (response.errors?.length)
      throw new Error(response.errors.map((error) => error.message ?? 'GraphQL error').join('; '));
    const result = response.data?.searchJobsV3;
    if (!result?.jobsInPage) throw new Error('Glints GraphQL response missing jobsInPage');
    return {
      jobs: result.jobsInPage.map((job) => this.mapJob(job)),
      hasMore: result.hasMore ?? false,
    };
  }

  private mapJob(job: GlintsJobEntity): ScrapedJob {
    let salary: string | null = null;
    if (job.shouldShowSalary && job.salaries?.[0]) {
      const sal = job.salaries[0];
      if (sal.minAmount != null && sal.maxAmount != null) {
        salary = `${sal.CurrencyCode ?? 'IDR'} ${sal.minAmount} - ${sal.maxAmount}`;
      }
    }

    const slug = job.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return {
      title: job.title,
      company: job.company?.name ?? null,
      location: job.location?.formattedName ?? null,
      url: `${this.baseUrl}/id/opportunities/jobs/${slug}/${job.id}`,
      salary,
      source: 'glints' as JobSource,
      jobId: job.id,
      postedAt: job.createdAt ?? null,
    };
  }
}
