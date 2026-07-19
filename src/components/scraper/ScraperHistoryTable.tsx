import type { JobSource, ScraperLogEntry } from '../../types';
import { formatRelativeTime, formatDateTime } from '../../utils/format';
import { SourceBadge } from '../ui/SourceBadge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ScraperHistoryTableProps {
  logs: ScraperLogEntry[];
}

export function ScraperHistoryTable({ logs }: ScraperHistoryTableProps) {
  if (logs.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-800 text-sm text-slate-500">
        No run history yet
      </div>
    );
  }

  return (
    <div
      className="max-h-[400px] overflow-auto rounded-xl border border-slate-800"
      role="region"
      aria-label="Scraper run history, horizontally scrollable"
    >
      <table className="min-w-[680px] w-full text-sm">
        <caption className="sr-only">Scraper run history</caption>
        <thead className="sticky top-0 bg-slate-900 z-10">
          <tr className="border-b border-slate-800 text-xs text-slate-400">
            <th scope="col" className="px-3 py-2.5 text-left font-semibold">Time</th>
            <th scope="col" className="px-3 py-2.5 text-left font-semibold">Portal</th>
            <th scope="col" className="px-3 py-2.5 text-left font-semibold">Status</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Jobs</th>
            <th scope="col" className="px-3 py-2.5 text-left font-semibold">Error</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/30">
              <td className="px-3 py-2.5 text-xs text-slate-400" title={formatDateTime(log.timestamp)}>
                <div className="text-slate-300">{formatDateTime(log.timestamp)}</div>
                <div>{formatRelativeTime(log.timestamp)}</div>
              </td>
              <td className="px-3 py-2.5">
                <SourceBadge source={log.source as JobSource} />
              </td>
              <td className="px-3 py-2.5">
                {log.status === 'success' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                    <AlertCircle size={13} aria-hidden="true" />
                    Error
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold text-slate-200">
                {log.jobsScrapedCount}
              </td>
              <td className="max-w-xs whitespace-normal break-words px-3 py-2.5 text-xs text-slate-400">
                {log.errorMessage ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
