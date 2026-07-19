import { eq, and, like, or, asc, desc, sql, inArray, notExists } from 'drizzle-orm';
import { db } from '../client';
import { jobs, applications } from '../schema';
import type { Job, ScrapedJob, Pagination, JobSource } from '../../../shared/src';

// ponytail: duplicated from scraper/core/dedup.ts to avoid circular dep (db ↔ scraper)
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

export function insertJob(job: ScrapedJob): number | null {
  const now = new Date().toISOString();
  const result = db
    .insert(jobs)
    .values({
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      salary: job.salary,
      source: job.source,
      jobId: job.jobId,
      postedAt: job.postedAt,
      scrapedAt: now,
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: jobs.id })
    .get();
  return result?.id ?? null;
}

// ponytail: canonical comparison strips query/hash/casing/trailing-slash to avoid cross-run bypasses
export function jobExistsByUrl(url: string): boolean {
  const canonical = canonicalUrl(url);
  // First try exact match (fast path, covers most cases)
  const exact = db.select({ id: jobs.id }).from(jobs).where(eq(jobs.url, url)).get();
  if (exact) return true;
  // Fallback: canonical comparison for URLs that differ only by qs/hash/casing/slash
  if (canonical !== url) {
    const similar = db
      .select({ url: jobs.url })
      .from(jobs)
      .where(like(jobs.url, `${canonical.split('?')[0]}%`))
      .limit(50)
      .all();
    return similar.some((row) => row.url !== null && canonicalUrl(row.url) === canonical);
  }
  return false;
}

export function jobExistsBySourceAndJobId(source: string, jobId: string | null): boolean {
  if (!jobId) return false;
  const result = db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.source, source as JobSource), eq(jobs.jobId, jobId)))
    .get();
  return result !== undefined;
}

export function findSimilarJobs(title: string | null, company: string | null): Partial<Job>[] {
  if (!title && !company) return [];
  const conditions = [];
  if (title) conditions.push(like(jobs.title, `%${title}%`));
  if (company) conditions.push(like(jobs.company, `%${company}%`));
  return db
    .select()
    .from(jobs)
    .where(or(...conditions))
    .limit(20)
    .all();
}

export function getJobById(id: number): Job | null {
  const result = db.select().from(jobs).where(eq(jobs.id, id)).get();
  return (result as Job | undefined) ?? null;
}

export function getJobs(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  location?: string;
  source?: string;
  sort?: 'newest' | 'title' | 'company';
}): { data: Job[]; pagination: Pagination } {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(jobs.hidden, 0), sql`${jobs.scrapedAt} >= datetime('now', '-7 days')`];

  if (params.keyword) {
    const keywordCond = or(
      like(jobs.title, `%${params.keyword}%`),
      like(jobs.company, `%${params.keyword}%`),
    );
    if (keywordCond) conditions.push(keywordCond);
  }
  if (params.location) {
    conditions.push(like(jobs.location, `%${params.location}%`));
  }
  if (params.source) {
    const sources = params.source
      .split(',')
      .map((source) => source.trim())
      .filter(Boolean) as JobSource[];
    if (sources.length > 0) conditions.push(inArray(jobs.source, sources));
  }

  conditions.push(
    notExists(
      db.select({ id: applications.id }).from(applications).where(eq(applications.jobId, jobs.id)),
    ),
  );

  const where = and(...conditions);
  const totalResult = db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(where)
    .get();
  const total = totalResult?.count ?? 0;

  const orderBy = params.sort === 'title'
    ? [asc(jobs.title), desc(jobs.id)]
    : params.sort === 'company'
      ? [asc(jobs.company), asc(jobs.title), desc(jobs.id)]
      : [desc(sql`coalesce(${jobs.postedAt}, ${jobs.scrapedAt})`), desc(jobs.id)];
  const data = db
    .select()
    .from(jobs)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset(offset)
    .all();

  return {
    data: data as Job[],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export function hideJob(id: number): boolean {
  return db.update(jobs).set({ hidden: 1 }).where(eq(jobs.id, id)).run().changes > 0;
}

export function unhideJob(id: number): boolean {
  return db.update(jobs).set({ hidden: 0 }).where(eq(jobs.id, id)).run().changes > 0;
}

export function deleteAllJobs(): number {
  const result = db.delete(jobs).run();
  return result.changes;
}
