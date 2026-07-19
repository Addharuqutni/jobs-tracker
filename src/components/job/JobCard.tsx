import {
  CheckCircle2,
  Heart,
  Ban,
  ExternalLink,
  MapPin,
  DollarSign,
  Building2,
  CalendarDays,
} from 'lucide-react';
import type { Job } from '../../types';
import { orNa, formatRelativeTime } from '../../utils/format';
import { isSafeUrl } from '../../utils/url';
import { SourceBadge } from '../ui/SourceBadge';

interface JobCardProps {
  job: Job;
  onLamar: (job: Job) => void;
  onWishlist: (job: Job) => void;
  onAbaikan: (job: Job) => void;
}

export function JobCard({ job, onLamar, onWishlist, onAbaikan }: JobCardProps) {
  const postedDate = job.postedAt
    ? new Date(job.postedAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  function handleLamar() {
    onLamar(job);
    if (isSafeUrl(job.url)) window.open(job.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <article
      data-job-id={job.jobId ?? undefined}
      className="group relative overflow-hidden border-2 border-slate-50 bg-white p-4 shadow-artistic-sm transition-all duration-200 before:absolute before:bottom-0 before:left-0 before:h-1.5 before:w-0 before:bg-purple-500 before:transition-all hover:-translate-y-1 hover:shadow-artistic hover:before:w-full sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-slate-100">
            {orNa(job.title)}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Building2 size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
              <span className="font-medium text-slate-300">{orNa(job.company)}</span>
            </span>
            {job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
                {job.location}
              </span>
            )}
            {job.salary && (
              <span className="inline-flex items-center gap-1.5">
                <DollarSign size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
                {job.salary}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <SourceBadge source={job.source} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {job.postedAt ? (
          <span
            className="inline-flex items-center gap-1.5"
            title={`Posted on ${postedDate ?? ''}`}
          >
            <CalendarDays size={13} aria-hidden="true" />
            <span>Posted {formatRelativeTime(job.postedAt)}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} aria-hidden="true" />
            Scraped {formatRelativeTime(job.scrapedAt)}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleLamar}
          className="control-focus inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 border-2 border-slate-50 bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-artistic-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 sm:flex-none"
        >
          <CheckCircle2 size={14} aria-hidden="true" />
          Apply
        </button>
        <button
          type="button"
          onClick={() => onWishlist(job)}
          className="control-focus inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 border-2 border-slate-50 bg-white px-3 py-2 text-xs font-bold text-slate-50 transition-colors hover:bg-slate-950 sm:flex-none"
        >
          <Heart size={14} aria-hidden="true" />
          Wishlist
        </button>
        <button
          type="button"
          onClick={() => onAbaikan(job)}
          className="control-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <Ban size={14} aria-hidden="true" />
          Hide
        </button>
        {isSafeUrl(job.url) && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View original listing"
            title="View original listing"
            className="control-focus ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200"
          >
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
