import { eq, and, sql, count } from 'drizzle-orm';
import { db } from '../client';
import { jobs, applications } from '../schema';
import type { AnalyticsData } from '../../../shared/src';
import { calculateFunnel } from './analytics-calculation';

export function getAnalytics(params: { from?: string; to?: string }): AnalyticsData {
  const dateFilter = [];
  if (params.from) dateFilter.push(sql`${applications.createdAt} >= ${params.from}`);
  if (params.to) dateFilter.push(sql`${applications.createdAt} < date(${params.to}, '+1 day')`);

  const summaryRows = db.select({
    status: applications.status,
    count: count(),
  }).from(applications)
    .where(dateFilter.length > 0 ? and(...dateFilter) : undefined)
    .groupBy(applications.status).all();

  const summaryMap = new Map(summaryRows.map(r => [r.status, r.count]));
  const total = summaryRows.reduce((sum, r) => sum + r.count, 0);
  const funnelRows = db.select({ status: applications.status, appliedAt: applications.appliedAt })
    .from(applications)
    .where(dateFilter.length > 0 ? and(...dateFilter) : undefined).all();
  const funnel = calculateFunnel(funnelRows);

  const bySourceRows = db.select({
    source: jobs.source,
    count: count(),
  }).from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(dateFilter.length > 0 ? and(...dateFilter) : undefined)
    .groupBy(jobs.source).all();

  const weeklyRows = db.select({
    week: sql<string>`strftime('%Y-W%W', ${applications.createdAt})`,
    applied: sql<number>`sum(CASE WHEN ${applications.status} = 'applied' THEN 1 ELSE 0 END)`,
    interview: sql<number>`sum(CASE WHEN ${applications.status} IN ('interview','offered') THEN 1 ELSE 0 END)`,
    rejected: sql<number>`sum(CASE WHEN ${applications.status} = 'rejected' THEN 1 ELSE 0 END)`,
    offered: sql<number>`sum(CASE WHEN ${applications.status} = 'offered' THEN 1 ELSE 0 END)`,
  }).from(applications)
    .where(dateFilter.length > 0 ? and(...dateFilter) : undefined)
    .groupBy(sql`strftime('%Y-W%W', ${applications.createdAt})`)
    .orderBy(sql`strftime('%Y-W%W', ${applications.createdAt})`).all();

  const effRows = db.select({
    source: jobs.source,
    applied: sql<number>`sum(CASE WHEN ${applications.status} IN ('applied','interview','rejected','offered') THEN 1 ELSE 0 END)`,
    interview: sql<number>`sum(CASE WHEN ${applications.status} = 'interview' THEN 1 ELSE 0 END)`,
    offered: sql<number>`sum(CASE WHEN ${applications.status} = 'offered' THEN 1 ELSE 0 END)`,
    rejected: sql<number>`sum(CASE WHEN ${applications.status} = 'rejected' THEN 1 ELSE 0 END)`,
  }).from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(dateFilter.length > 0 ? and(...dateFilter) : undefined)
    .groupBy(jobs.source).all();

  return {
    current: {
      total,
      wishlist: summaryMap.get('wishlist') ?? 0,
      applied: summaryMap.get('applied') ?? 0,
      interview: summaryMap.get('interview') ?? 0,
      offered: summaryMap.get('offered') ?? 0,
      rejected: summaryMap.get('rejected') ?? 0,
    },
    summary: {
      total,
      wishlist: summaryMap.get('wishlist') ?? 0,
      applied: funnel.applied,
      interview: funnel.interview,
      offered: funnel.offered,
      rejected: summaryMap.get('rejected') ?? 0,
    },
    interviewRate: funnel.applied > 0 ? funnel.interview / funnel.applied : 0,
    offerRate: funnel.applied > 0 ? funnel.offered / funnel.applied : 0,
    bySource: bySourceRows.map(r => ({ source: r.source, count: r.count })),
    weeklyTrend: weeklyRows.map(r => ({
      week: r.week,
      applied: r.applied,
      interview: r.interview,
      rejected: r.rejected,
      offered: r.offered,
    })),
    sourceEffectiveness: effRows.map(r => ({
      source: r.source,
      applied: r.applied,
      interview: r.interview,
      offered: r.offered,
      rejected: r.rejected,
      interviewRate: r.applied > 0 ? r.interview / r.applied : 0,
    })),
  };
}
