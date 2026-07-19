import type {
  AnalyticsData,
  Application,
  ApplicationStatus,
  Job,
  JobSource,
  Pagination,
  ScraperLogEntry,
  ScraperStatus,
} from '../types';
import { computeAnalytics } from './analytics';

const DB_NAME = 'jobs-app';
const DB_VERSION = 1;

export interface ScrapedJobInput {
  title: string | null;
  company: string | null;
  location: string | null;
  url: string | null;
  salary: string | null;
  source: JobSource;
  jobId: string | null;
  postedAt: string | null;
}

export interface ScraperLogInput {
  source: string;
  status: 'success' | 'error';
  errorMessage: string | null;
  jobsScrapedCount: number;
  timestamp?: string;
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, '').toLowerCase();
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('jobs')) {
        const jobs = db.createObjectStore('jobs', { keyPath: 'id', autoIncrement: true });
        jobs.createIndex('url', 'url', { unique: false });
        jobs.createIndex('source', 'source', { unique: false });
        jobs.createIndex('sourceJobId', ['source', 'jobId'], { unique: false });
        jobs.createIndex('scrapedAt', 'scrapedAt', { unique: false });
        jobs.createIndex('hidden', 'hidden', { unique: false });
      }
      if (!db.objectStoreNames.contains('applications')) {
        const apps = db.createObjectStore('applications', { keyPath: 'id', autoIncrement: true });
        apps.createIndex('jobId', 'jobId', { unique: true });
        apps.createIndex('status', 'status', { unique: false });
        apps.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('scraper_logs')) {
        const logs = db.createObjectStore('scraper_logs', { keyPath: 'id', autoIncrement: true });
        logs.createIndex('source', 'source', { unique: false });
        logs.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

async function getAllJobsRaw(db: IDBDatabase): Promise<Job[]> {
  return reqToPromise(db.transaction('jobs', 'readonly').objectStore('jobs').getAll()) as Promise<Job[]>;
}

async function getAllAppsRaw(db: IDBDatabase): Promise<Application[]> {
  return reqToPromise(
    db.transaction('applications', 'readonly').objectStore('applications').getAll(),
  ) as Promise<Application[]>;
}

async function getAllLogsRaw(db: IDBDatabase): Promise<ScraperLogEntry[]> {
  return reqToPromise(
    db.transaction('scraper_logs', 'readonly').objectStore('scraper_logs').getAll(),
  ) as Promise<ScraperLogEntry[]>;
}

export async function mergeJobs(scraped: ScrapedJobInput[]): Promise<{ inserted: number }> {
  if (scraped.length === 0) return { inserted: 0 };
  const db = await openDb();
  const existing = await getAllJobsRaw(db);
  const urlSet = new Set(
    existing.filter((j) => j.url).map((j) => canonicalUrl(j.url as string)),
  );
  const sourceJobSet = new Set(
    existing
      .filter((j) => j.jobId)
      .map((j) => `${j.source}:${j.jobId}`),
  );

  const now = new Date().toISOString();
  const toInsert: Omit<Job, 'id'>[] = [];
  for (const job of scraped) {
    if (job.jobId && sourceJobSet.has(`${job.source}:${job.jobId}`)) continue;
    if (job.url && urlSet.has(canonicalUrl(job.url))) continue;
    if (job.url) urlSet.add(canonicalUrl(job.url));
    if (job.jobId) sourceJobSet.add(`${job.source}:${job.jobId}`);
    toInsert.push({
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      salary: job.salary,
      source: job.source,
      jobId: job.jobId,
      postedAt: job.postedAt,
      scrapedAt: now,
      hidden: 0,
      createdAt: now,
    });
  }

  if (toInsert.length === 0) {
    db.close();
    return { inserted: 0 };
  }

  const tx = db.transaction('jobs', 'readwrite');
  const store = tx.objectStore('jobs');
  for (const row of toInsert) store.add(row);
  await txDone(tx);
  db.close();
  return { inserted: toInsert.length };
}

export async function getJobs(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  location?: string;
  source?: string;
  sort?: 'newest' | 'title' | 'company';
}): Promise<{ data: Job[]; pagination: Pagination }> {
  const db = await openDb();
  const [jobs, apps] = await Promise.all([getAllJobsRaw(db), getAllAppsRaw(db)]);
  db.close();

  const tracked = new Set(apps.map((a) => a.jobId));
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const sources = params.source
    ? params.source
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const keyword = params.keyword?.toLowerCase();
  const location = params.location?.toLowerCase();

  let filtered = jobs.filter((job) => {
    if (job.hidden) return false;
    if (tracked.has(job.id)) return false;
    if (Date.parse(job.scrapedAt) < sevenDaysAgo) return false;
    if (keyword) {
      const t = (job.title ?? '').toLowerCase();
      const c = (job.company ?? '').toLowerCase();
      if (!t.includes(keyword) && !c.includes(keyword)) return false;
    }
    if (location && !(job.location ?? '').toLowerCase().includes(location)) return false;
    if (sources.length > 0 && !sources.includes(job.source)) return false;
    return true;
  });

  const sort = params.sort ?? 'newest';
  filtered = filtered.sort((a, b) => {
    if (sort === 'title') return (a.title ?? '').localeCompare(b.title ?? '') || b.id - a.id;
    if (sort === 'company') {
      return (
        (a.company ?? '').localeCompare(b.company ?? '') ||
        (a.title ?? '').localeCompare(b.title ?? '') ||
        b.id - a.id
      );
    }
    const aTime = Date.parse(a.postedAt ?? a.scrapedAt);
    const bTime = Date.parse(b.postedAt ?? b.scrapedAt);
    return bTime - aTime || b.id - a.id;
  });

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 0,
    },
  };
}

export async function hideJob(id: number): Promise<boolean> {
  const db = await openDb();
  const tx = db.transaction('jobs', 'readwrite');
  const store = tx.objectStore('jobs');
  const job = (await reqToPromise(store.get(id))) as Job | undefined;
  if (!job) {
    db.close();
    return false;
  }
  store.put({ ...job, hidden: 1 });
  await txDone(tx);
  db.close();
  return true;
}

export async function unhideJob(id: number): Promise<boolean> {
  const db = await openDb();
  const tx = db.transaction('jobs', 'readwrite');
  const store = tx.objectStore('jobs');
  const job = (await reqToPromise(store.get(id))) as Job | undefined;
  if (!job) {
    db.close();
    return false;
  }
  store.put({ ...job, hidden: 0 });
  await txDone(tx);
  db.close();
  return true;
}

export async function deleteAllJobs(): Promise<{ deleted: number }> {
  const db = await openDb();
  const jobs = await getAllJobsRaw(db);
  const tx = db.transaction(['jobs', 'applications'], 'readwrite');
  tx.objectStore('jobs').clear();
  tx.objectStore('applications').clear();
  await txDone(tx);
  db.close();
  return { deleted: jobs.length };
}

export async function trackJob(
  jobId: number,
  status: 'wishlist' | 'applied',
): Promise<Application> {
  const db = await openDb();
  const job = (await reqToPromise(
    db.transaction('jobs', 'readonly').objectStore('jobs').get(jobId),
  )) as Job | undefined;
  if (!job) {
    db.close();
    throw new Error('Job not found');
  }

  const existing = (await reqToPromise(
    db.transaction('applications', 'readonly').objectStore('applications').index('jobId').get(jobId),
  )) as Application | undefined;
  if (existing) {
    db.close();
    throw new Error('Application already exists for this job');
  }

  const now = new Date().toISOString();
  const row: Omit<Application, 'id' | 'job'> = {
    jobId,
    status,
    notes: '',
    appliedAt: status === 'applied' ? now : null,
    statusUpdatedAt: now,
    createdAt: now,
  };

  const tx = db.transaction('applications', 'readwrite');
  const id = (await reqToPromise(tx.objectStore('applications').add(row))) as number;
  await txDone(tx);
  db.close();
  return { ...row, id, job };
}

export async function getApplications(params?: {
  status?: string;
  source?: string;
  keyword?: string;
  from?: string;
  to?: string;
}): Promise<Application[]> {
  const db = await openDb();
  const [apps, jobs] = await Promise.all([getAllAppsRaw(db), getAllJobsRaw(db)]);
  db.close();

  const jobsById = new Map(jobs.map((j) => [j.id, j]));
  const statuses = params?.status
    ? params.status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const keyword = params?.keyword?.toLowerCase();
  const fromTs = params?.from ? Date.parse(params.from) : null;
  const toTs = params?.to ? Date.parse(params.to) + 86_400_000 : null;

  return apps
    .map((app) => ({ ...app, job: jobsById.get(app.jobId) }))
    .filter((app) => {
      if (statuses.length > 0 && !statuses.includes(app.status)) return false;
      if (params?.source && app.job?.source !== params.source) return false;
      if (keyword) {
        const t = (app.job?.title ?? '').toLowerCase();
        const c = (app.job?.company ?? '').toLowerCase();
        if (!t.includes(keyword) && !c.includes(keyword)) return false;
      }
      const created = Date.parse(app.createdAt);
      if (fromTs !== null && !Number.isNaN(fromTs) && created < fromTs) return false;
      if (toTs !== null && !Number.isNaN(toTs) && created >= toTs) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.statusUpdatedAt) - Date.parse(a.statusUpdatedAt));
}

export async function updateApplication(
  id: number,
  body: { status?: ApplicationStatus; notes?: string },
): Promise<Application> {
  const db = await openDb();
  const tx = db.transaction(['applications', 'jobs'], 'readwrite');
  const store = tx.objectStore('applications');
  const existing = (await reqToPromise(store.get(id))) as Application | undefined;
  if (!existing) {
    db.close();
    throw new Error('Application not found');
  }

  const now = new Date().toISOString();
  const updated: Application = {
    ...existing,
    status: body.status ?? existing.status,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    statusUpdatedAt: now,
    appliedAt:
      body.status === 'applied' && !existing.appliedAt ? now : existing.appliedAt,
  };
  store.put(updated);
  const job = (await reqToPromise(tx.objectStore('jobs').get(existing.jobId))) as Job | undefined;
  await txDone(tx);
  db.close();
  return { ...updated, job };
}

export async function deleteApplication(id: number): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('applications', 'readwrite');
  tx.objectStore('applications').delete(id);
  await txDone(tx);
  db.close();
}

export async function deleteApplicationsByStatus(status: ApplicationStatus): Promise<{ deleted: number }> {
  const db = await openDb();
  const apps = await getAllAppsRaw(db);
  const toDelete = apps.filter((a) => a.status === status);
  const tx = db.transaction('applications', 'readwrite');
  const store = tx.objectStore('applications');
  for (const app of toDelete) store.delete(app.id);
  await txDone(tx);
  db.close();
  return { deleted: toDelete.length };
}

export async function addScraperLogs(logs: ScraperLogInput[]): Promise<void> {
  if (logs.length === 0) return;
  const db = await openDb();
  const tx = db.transaction('scraper_logs', 'readwrite');
  const store = tx.objectStore('scraper_logs');
  for (const log of logs) {
    store.add({
      source: log.source,
      status: log.status,
      errorMessage: log.errorMessage,
      jobsScrapedCount: log.jobsScrapedCount,
      timestamp: log.timestamp ?? new Date().toISOString(),
    });
  }
  await txDone(tx);
  db.close();
}

export async function getScraperLogs(limit = 50): Promise<ScraperLogEntry[]> {
  const db = await openDb();
  const logs = await getAllLogsRaw(db);
  db.close();
  return logs
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, limit);
}

export async function getPortalStatusFromLogs(sources: string[]): Promise<ScraperStatus[]> {
  const logs = await getScraperLogs(200);
  return sources.map((source) => {
    const latest = logs.find((l) => l.source === source);
    if (!latest) {
      return {
        source,
        lastStatus: null,
        lastRun: '',
        jobsScraped: 0,
        errorMessage: null,
      };
    }
    return {
      source,
      lastStatus: latest.status,
      lastRun: latest.timestamp,
      jobsScraped: latest.jobsScrapedCount,
      errorMessage: latest.errorMessage,
    };
  });
}

export async function getAnalytics(params?: { from?: string; to?: string }): Promise<AnalyticsData> {
  const db = await openDb();
  const [apps, jobs] = await Promise.all([getAllAppsRaw(db), getAllJobsRaw(db)]);
  db.close();
  const jobsById = new Map(jobs.map((j) => [j.id, j]));
  const withJobs = apps.map((a) => ({ ...a, job: jobsById.get(a.jobId) }));
  return computeAnalytics(withJobs, jobsById, params);
}

export async function exportApplicationsCsv(params?: {
  status?: string;
  from?: string;
  to?: string;
}): Promise<Blob> {
  const applications = await getApplications(params);
  const lines = [
    'id,title,company,location,url,salary,source,posted_at,status,notes,applied_at,status_updated_at,created_at',
  ];
  for (const app of applications) {
    const job = app.job;
    lines.push(
      [
        app.id,
        csvEscape(job?.title ?? ''),
        csvEscape(job?.company ?? ''),
        csvEscape(job?.location ?? ''),
        csvEscape(job?.url ?? ''),
        csvEscape(job?.salary ?? ''),
        csvEscape(job?.source ?? ''),
        csvEscape(job?.postedAt ?? ''),
        csvEscape(app.status),
        csvEscape(app.notes ?? ''),
        csvEscape(app.appliedAt ?? ''),
        csvEscape(app.statusUpdatedAt),
        csvEscape(app.createdAt),
      ].join(','),
    );
  }
  return new Blob([lines.join('\n')], { type: 'text/csv' });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function getJobById(id: number): Promise<Job | null> {
  const db = await openDb();
  const job = (await reqToPromise(
    db.transaction('jobs', 'readonly').objectStore('jobs').get(id),
  )) as Job | undefined;
  db.close();
  return job ?? null;
}
