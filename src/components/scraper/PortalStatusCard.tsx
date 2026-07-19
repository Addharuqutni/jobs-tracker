import type { JobSource, ScraperStatus } from '../../types';
import { formatRelativeTime } from '../../utils/format';
import { SourceBadge } from '../ui/SourceBadge';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface PortalStatusCardProps {
  portal: ScraperStatus;
  configured: boolean;
}

export function PortalStatusCard({ portal, configured }: PortalStatusCardProps) {
  const isSuccess = portal.lastStatus === 'success';
  const isError = portal.lastStatus === 'error';
  const isUnknown = !isSuccess && !isError;

  const statusLabel = configured
    ? isError
      ? 'Failed'
      : isSuccess
        ? 'Success'
        : 'Not run'
    : 'Not configured';

  return (
    <div
      className={`border-2 bg-white p-4 shadow-artistic-sm transition-transform hover:-translate-y-0.5 ${
        isError
          ? 'border-red-500/30 hover:border-red-500/40'
          : isSuccess
            ? 'border-slate-800 hover:border-slate-700'
            : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <SourceBadge source={portal.source as JobSource} />
        {configured ? (
          isError ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
              <AlertCircle size={14} aria-hidden="true" />
              <span className="sr-only">Status: </span>
              {statusLabel}
            </span>
          ) : isSuccess ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
              <CheckCircle2 size={14} aria-hidden="true" />
              <span className="sr-only">Status: </span>
              {statusLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
              <Clock size={14} aria-hidden="true" />
              <span className="sr-only">Status: </span>
              {statusLabel}
            </span>
          )
        ) : (
          <span className="text-xs font-medium text-slate-600">TBD</span>
        )}
      </div>

      {configured ? (
        <>
          <div className="mb-1 font-display text-2xl tracking-tight text-slate-50">
            {portal.jobsScraped}
            <span className="ml-1.5 text-xs font-normal text-slate-500">last run</span>
          </div>
          <div className="text-xs text-slate-400">
            {portal.lastRun ? formatRelativeTime(portal.lastRun) : 'Not run yet'}
          </div>
          {isError && portal.errorMessage && (
            <div
              className="mt-2 truncate rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-400"
              title={portal.errorMessage}
            >
              {portal.errorMessage}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="text-lg font-bold text-slate-600">—</div>
          <div className="text-xs text-slate-500">{isUnknown ? 'Not yet run' : statusLabel}</div>
        </div>
      )}
    </div>
  );
}
