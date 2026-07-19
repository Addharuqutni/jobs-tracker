import { eq, and, desc, inArray, like, or, sql } from 'drizzle-orm';
import { db } from '../client';
import { jobs, applications } from '../schema';
import type { Application, ApplicationStatus } from '../../../shared/src';

export function trackJob(jobId: number, status: 'wishlist' | 'applied'): Application | null {
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) return null;

  const result = db.insert(applications).values({
    jobId,
    status,
    appliedAt: status === 'applied' ? new Date().toISOString() : null,
  }).returning().get();

  return { ...result, job } as Application;
}

export function applicationExistsForJob(jobId: number): boolean {
  const result = db.select({ id: applications.id }).from(applications)
    .where(eq(applications.jobId, jobId)).get();
  return result !== undefined;
}

export function getApplications(params: {
  statuses?: ApplicationStatus[];
  source?: string;
  keyword?: string;
  from?: string;
  to?: string;
}): Application[] {
  const conditions = [];
  if (params.statuses?.length) {
    conditions.push(inArray(applications.status, params.statuses));
  }
  if (params.source) conditions.push(eq(jobs.source, params.source as typeof jobs.source._.data));
  if (params.keyword) {
    const search = or(like(jobs.title, `%${params.keyword}%`), like(jobs.company, `%${params.keyword}%`));
    if (search) conditions.push(search);
  }
  if (params.from) conditions.push(sql`${applications.createdAt} >= ${params.from}`);
  if (params.to) conditions.push(sql`${applications.createdAt} < date(${params.to}, '+1 day')`);

  const rows = db.select({
    application: applications,
    job: jobs,
  })
  .from(applications)
  .innerJoin(jobs, eq(applications.jobId, jobs.id))
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(desc(applications.statusUpdatedAt))
  .all();

  return rows.map(r => ({
    ...r.application,
    job: r.job,
  })) as Application[];
}

export function updateApplication(
  id: number,
  body: { status?: ApplicationStatus; notes?: string }
): Application | null {
  const existing = db.select().from(applications).where(eq(applications.id, id)).get();
  if (!existing) return null;

  const updates: Record<string, unknown> = {
    statusUpdatedAt: new Date().toISOString(),
  };
  if (body.status) {
    updates.status = body.status;
    if (body.status === 'applied' && !existing.appliedAt) {
      updates.appliedAt = new Date().toISOString();
    }
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }

  db.update(applications).set(updates).where(eq(applications.id, id)).run();

  const updated = db.select().from(applications).where(eq(applications.id, id)).get();
  const job = db.select().from(jobs).where(eq(jobs.id, existing.jobId)).get();
  return { ...updated, job } as Application;
}

export function deleteApplication(id: number): boolean {
  const result = db.delete(applications).where(eq(applications.id, id)).run();
  return result.changes > 0;
}

export function deleteApplicationsByStatus(status: ApplicationStatus): number {
  const result = db.delete(applications).where(eq(applications.status, status)).run();
  return result.changes;
}
