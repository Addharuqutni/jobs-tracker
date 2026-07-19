import type { AdapterResult, AdapterConfig, ScrapedJob } from '../../../shared/src';
import { fetchPage, fetchJson, isBlocked } from '../utils/http';
import { fetchWithPuppeteer } from '../utils/puppeteer-pool';

export function isRecentListingDate(dateStr: string | null | undefined, now = Date.now()): boolean {
  if (!dateStr) return true;
  const timestamp = new Date(dateStr).getTime();
  if (Number.isNaN(timestamp)) return false;
  return timestamp <= now && timestamp >= now - 7 * 24 * 60 * 60 * 1000;
}

export abstract class BaseAdapter {
  abstract source: string;
  abstract baseUrl: string;
  abstract config: AdapterConfig;

  abstract scrape(keyword?: string): Promise<AdapterResult>;

  protected isWithinLastWeek(dateStr: string | null | undefined): boolean {
    return isRecentListingDate(dateStr);
  }

  protected async fetchHtml(url: string, waitSelector?: string): Promise<string> {
    try {
      return await fetchPage(url, this.config.timeoutMs);
    } catch (err) {
      if (isBlocked(err)) {
        return await fetchWithPuppeteer(url, waitSelector, this.config.timeoutMs);
      }
      throw err;
    }
  }

  protected async getJson<T>(url: string, options?: RequestInit): Promise<T> {
    return await fetchJson<T>(url, options, this.config.timeoutMs);
  }

  protected async delay(minMs?: number, maxMs?: number): Promise<void> {
    const min = minMs ?? this.config.delayMinMs;
    const max = maxMs ?? this.config.delayMaxMs;
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected success(jobs: ScrapedJob[]): AdapterResult {
    return {
      source: this.source,
      status: 'success',
      jobs,
      errorMessage: null,
      jobsScrapedCount: jobs.length,
    };
  }

  protected error(message: string): AdapterResult {
    return {
      source: this.source,
      status: 'error',
      jobs: [],
      errorMessage: message,
      jobsScrapedCount: 0,
    };
  }
}
