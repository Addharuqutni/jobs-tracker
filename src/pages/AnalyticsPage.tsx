import { lazy, Suspense } from 'react';
import { Download, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToast } from '../components/ui/Toast';
import * as idb from '../lib/idb';
import { getUserMessage } from '../lib/errors';
import { formatRate } from '../utils/format';
import { StatCard } from '../components/charts/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingCard, EmptyState, ErrorState } from '../components/ui/States';
import type { AnalyticsData } from '../types';

// one chunk for all recharts widgets
const ChartsSection = lazy(async () => {
  const m = await import('../components/charts/Charts');
  return {
    default: function ChartsSection({ data }: { data: AnalyticsData }) {
      return (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-300">Current Pipeline</h3>
              <m.StatusBarChart data={data} />
            </Card>
            <Card className="lg:col-span-7">
              <h3 className="mb-6 text-sm font-semibold text-slate-300">Application Funnel</h3>
              <m.ApplicationFunnel data={data} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-300">Applications by Source</h3>
              <m.SourcePieChart data={data} />
            </Card>
            <Card className="lg:col-span-7">
              <h3 className="mb-4 text-sm font-semibold text-slate-300">Weekly Application Trend</h3>
              <m.WeeklyTrendLineChart data={data} />
            </Card>
          </div>

          <Card>
            <h3 className="mb-4 text-sm font-semibold text-slate-300">Source Effectiveness</h3>
            <m.SourceEffectivenessTable data={data} />
          </Card>
        </>
      );
    },
  };
});

function ChartsFallback() {
  return (
    <div className="space-y-4" role="status" aria-busy="true">
      <span className="sr-only">Loading charts</span>
      <div className="h-64">
        <LoadingCard />
      </div>
      <div className="h-64">
        <LoadingCard />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useAnalytics();
  const { show } = useToast();

  async function handleExport() {
    try {
      const blob = await idb.exportApplicationsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      show('Export downloaded');
    } catch (err) {
      show(getUserMessage(err), 'error');
    }
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="page-shell max-w-none">
        <span className="sr-only">Loading analytics</span>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={i === 0 ? 'md:col-span-5' : i === 1 ? 'md:col-span-3' : 'md:col-span-4'}
            >
              <LoadingCard />
            </div>
          ))}
        </div>
        <LoadingCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!data || data.summary.total === 0) {
    return (
      <div className="page-shell max-w-none">
        <div>
          <p className="mb-2 inline-block bg-purple-500 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
            Insights
          </p>
          <h1 className="page-heading">Analytics</h1>
        </div>
        <EmptyState
          icon={<BarChart3 size={48} />}
          title="No data to analyze yet"
          description="Start tracking applications to see your analytics here."
          action={
            <Button variant="primary" onClick={() => navigate('/feed')}>
              Go to Job Feed
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-none">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 inline-block bg-purple-500 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
            Insights
          </p>
          <h1 className="page-heading">Analytics</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-5">
          <StatCard
            label="Total Applications"
            value={data.summary.total}
            subtitle={`${data.summary.applied} applied · ${data.summary.wishlist} wishlist`}
          />
        </div>
        <div className="md:col-span-3">
          <StatCard
            label="Interview Rate"
            value={formatRate(data.interviewRate)}
            subtitle={`${data.summary.interview} of ${data.summary.applied} applied`}
          />
        </div>
        <div className="md:col-span-4">
          <StatCard
            label="Offer Rate"
            value={formatRate(data.offerRate)}
            subtitle={`${data.summary.offered} of ${data.summary.applied} applied`}
          />
        </div>
      </div>

      <Suspense fallback={<ChartsFallback />}>
        <ChartsSection data={data} />
      </Suspense>
    </div>
  );
}
