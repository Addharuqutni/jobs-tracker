import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import type { AnalyticsData, SourceCount, WeeklyTrend, SourceEffectiveness } from '../../types';
import { SOURCE_LABELS, STATUS_LABELS } from '../../constants';
import { formatRate } from '../../utils/format';

const STATUS_COLORS_MAP: Record<string, string> = {
  wishlist: '#3b82f6',
  applied: '#d97706',
  interview: '#16a34a',
  offered: '#16a34a',
  rejected: '#dc2626',
};

const SOURCE_COLORS: string[] = ['#3b82f6', '#0ea5e9', '#a855f7', '#f97316', '#ec4899'];

// ponytail: Recharts requires inline contentStyle for tooltip theming; runtime chart width also inline.
const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '2px solid #111827',
  borderRadius: '0',
  color: '#111827',
  boxShadow: '3px 3px 0 #111827',
  fontSize: '12px',
  padding: '8px 12px',
} as const;

interface ChartsProps {
  data: AnalyticsData;
}

export function StatusBarChart({ data }: ChartsProps) {
  const chartData = [
    {
      name: STATUS_LABELS.wishlist,
      count: data.current.wishlist,
      fill: STATUS_COLORS_MAP.wishlist,
    },
    { name: STATUS_LABELS.applied, count: data.current.applied, fill: STATUS_COLORS_MAP.applied },
    {
      name: STATUS_LABELS.interview,
      count: data.current.interview,
      fill: STATUS_COLORS_MAP.interview,
    },
    { name: STATUS_LABELS.offered, count: data.current.offered, fill: STATUS_COLORS_MAP.offered },
    {
      name: STATUS_LABELS.rejected,
      count: data.current.rejected,
      fill: STATUS_COLORS_MAP.rejected,
    },
  ];

  return (
    <div>
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
            <XAxis
              dataKey="name"
              stroke="#4b5563"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-24}
              textAnchor="end"
              height={52}
            />
            <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#3b82f615' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <span
        className="sr-only"
        role="img"
        aria-label={`Current applications by status: ${chartData.map((item) => `${item.name} ${item.count}`).join(', ')}`}
      />
    </div>
  );
}

export function SourcePieChart({ data }: ChartsProps) {
  const chartData = data.bySource.map((s: SourceCount) => ({
    name: SOURCE_LABELS[s.source as keyof typeof SOURCE_LABELS] ?? s.source,
    value: s.count,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={48}
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs min-[420px]:grid-cols-2">
        {chartData.map((entry, i) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
              aria-hidden="true"
            />
            <span className="text-slate-400">{entry.name}</span>
            <span className="ml-auto font-semibold text-slate-200">{entry.value}</span>
          </li>
        ))}
      </ul>
      <span
        className="sr-only"
        role="img"
        aria-label={`Applications by source: ${chartData.map((item) => `${item.name} ${item.value}`).join(', ')}`}
      />
    </div>
  );
}

export function ApplicationFunnel({ data }: ChartsProps) {
  const stages = [
    { label: 'Applied', value: data.summary.applied, color: 'bg-amber-500' },
    { label: 'Interviewed', value: data.summary.interview, color: 'bg-green-500' },
    { label: 'Offered', value: data.summary.offered, color: 'bg-green-500' },
  ];
  const maximum = Math.max(data.summary.applied, 1);

  return (
    <section className="flex flex-col gap-4" aria-label="Application funnel">
      {stages.map((stage) => {
        const pct = (stage.value / maximum) * 100;
        const width = stage.value > 0 ? Math.max(pct, 4) : 0;
        return (
          <div
            key={stage.label}
            className="grid grid-cols-[76px_minmax(0,1fr)_36px] items-center gap-2 sm:grid-cols-[88px_minmax(0,1fr)_42px] sm:gap-3"
          >
            <span className="text-xs font-semibold text-slate-400">{stage.label}</span>
            <div className="h-8 overflow-hidden rounded-md bg-slate-800">
              <div
                className={`flex h-full items-center rounded-md transition-all ${stage.color}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="text-right text-sm font-bold text-slate-200">{stage.value}</span>
          </div>
        );
      })}
      <p className="text-xs text-slate-500">
        Progressed stages are cumulative; rejected applications remain in Applied.
      </p>
    </section>
  );
}

export function WeeklyTrendLineChart({ data }: ChartsProps) {
  const chartData = data.weeklyTrend.map((w: WeeklyTrend) => ({
    week: w.week,
    Applied: w.applied,
    Interview: w.interview,
    Offered: w.offered,
    Rejected: w.rejected,
  }));

  return (
    <div>
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
            <XAxis
              dataKey="week"
              stroke="#4b5563"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="Applied"
              stroke="#d97706"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Interview"
              stroke="#16a34a"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Offered"
              stroke="#16a34a"
              strokeWidth={2}
              strokeDasharray="2 4"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Rejected"
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span
        className="sr-only"
        role="img"
        aria-label={`Weekly application trend: ${chartData.map((item) => `${item.week}, Applied ${item.Applied}, Interview ${item.Interview}, Offered ${item.Offered}, Rejected ${item.Rejected}`).join('; ')}`}
      />
    </div>
  );
}

export function SourceEffectivenessTable({ data }: ChartsProps) {
  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label="Source effectiveness table, horizontally scrollable"
    >
      <table className="min-w-[620px] w-full text-sm">
        <caption className="sr-only">Application outcomes and interview rate by source</caption>
        <thead>
          <tr className="border-b border-slate-800 text-xs text-slate-400">
            <th scope="col" className="py-2.5 text-left font-semibold">
              Source
            </th>
            <th scope="col" className="py-2.5 text-right font-semibold">
              Applied
            </th>
            <th scope="col" className="py-2.5 text-right font-semibold">
              Interview
            </th>
            <th scope="col" className="py-2.5 text-right font-semibold">
              Offered
            </th>
            <th scope="col" className="py-2.5 text-right font-semibold">
              Rejected
            </th>
            <th scope="col" className="py-2.5 text-right font-semibold">
              Int. Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {data.sourceEffectiveness.map((row: SourceEffectiveness) => (
            <tr
              key={row.source}
              className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/30"
            >
              <td className="py-2.5 text-slate-200">
                {SOURCE_LABELS[row.source as keyof typeof SOURCE_LABELS] ?? row.source}
              </td>
              <td className="py-2.5 text-right text-slate-300">{row.applied}</td>
              <td className="py-2.5 text-right text-slate-300">{row.interview}</td>
              <td className="py-2.5 text-right text-slate-300">{row.offered}</td>
              <td className="py-2.5 text-right text-slate-300">{row.rejected}</td>
              <td className="py-2.5 text-right font-semibold text-slate-200">
                {formatRate(row.interviewRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
