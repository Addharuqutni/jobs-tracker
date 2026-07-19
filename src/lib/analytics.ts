import type {
  AnalyticsData,
  Application,
  ApplicationStatus,
  Job,
} from '../types';

function calculateFunnel(rows: Array<{ status: ApplicationStatus; appliedAt: string | null }>) {
  return rows.reduce(
    (result, row) => {
      if (row.appliedAt || row.status !== 'wishlist') result.applied += 1;
      if (row.status === 'interview' || row.status === 'offered') result.interview += 1;
      if (row.status === 'offered') result.offered += 1;
      return result;
    },
    { applied: 0, interview: 0, offered: 0 },
  );
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const year = d.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const day = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  const week = Math.floor((day + start.getUTCDay()) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function computeAnalytics(
  applications: Application[],
  jobsById: Map<number, Job>,
  params?: { from?: string; to?: string },
): AnalyticsData {
  const fromTs = params?.from ? Date.parse(params.from) : null;
  const toTs = params?.to ? Date.parse(params.to) + 86_400_000 : null;

  const filtered = applications.filter((app) => {
    const t = Date.parse(app.createdAt);
    if (Number.isNaN(t)) return true;
    if (fromTs !== null && !Number.isNaN(fromTs) && t < fromTs) return false;
    if (toTs !== null && !Number.isNaN(toTs) && t >= toTs) return false;
    return true;
  });

  const summaryMap = new Map<ApplicationStatus, number>();
  for (const app of filtered) {
    summaryMap.set(app.status, (summaryMap.get(app.status) ?? 0) + 1);
  }
  const total = filtered.length;
  const funnel = calculateFunnel(filtered);

  const bySourceMap = new Map<string, number>();
  const effMap = new Map<
    string,
    { applied: number; interview: number; offered: number; rejected: number }
  >();
  const weekMap = new Map<
    string,
    { applied: number; interview: number; rejected: number; offered: number }
  >();

  for (const app of filtered) {
    const job = app.job ?? jobsById.get(app.jobId);
    const source = job?.source ?? 'unknown';
    bySourceMap.set(source, (bySourceMap.get(source) ?? 0) + 1);

    const eff = effMap.get(source) ?? { applied: 0, interview: 0, offered: 0, rejected: 0 };
    if (app.status === 'applied' || app.status === 'interview' || app.status === 'rejected' || app.status === 'offered') {
      eff.applied += 1;
    }
    if (app.status === 'interview') eff.interview += 1;
    if (app.status === 'offered') eff.offered += 1;
    if (app.status === 'rejected') eff.rejected += 1;
    effMap.set(source, eff);

    const week = weekKey(app.createdAt);
    const w = weekMap.get(week) ?? { applied: 0, interview: 0, rejected: 0, offered: 0 };
    if (app.status === 'applied') w.applied += 1;
    if (app.status === 'interview' || app.status === 'offered') w.interview += 1;
    if (app.status === 'rejected') w.rejected += 1;
    if (app.status === 'offered') w.offered += 1;
    weekMap.set(week, w);
  }

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
    bySource: [...bySourceMap.entries()].map(([source, count]) => ({ source, count })),
    weeklyTrend: [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, row]) => ({ week, ...row })),
    sourceEffectiveness: [...effMap.entries()].map(([source, row]) => ({
      source,
      ...row,
      interviewRate: row.applied > 0 ? row.interview / row.applied : 0,
    })),
  };
}
