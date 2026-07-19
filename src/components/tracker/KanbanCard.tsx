import { Draggable } from '@hello-pangea/dnd';
import { CalendarDays } from 'lucide-react';
import type { Application } from '../../types';
import { STATUS_COLORS } from '../../constants';
import { orNa, formatRelativeTime } from '../../utils/format';
import { SourceBadge } from '../ui/SourceBadge';

interface KanbanCardProps {
  application: Application;
  index: number;
  onClick: () => void;
}

export function KanbanCard({ application, index, onClick }: KanbanCardProps) {
  const job = application.job;
  const colors = STATUS_COLORS[application.status];

  return (
    <Draggable draggableId={String(application.id)} index={index}>
      {(provided, snapshot) => (
        <button
          type="button"
          aria-label={`Open ${orNa(job?.title)} application details, current status ${application.status}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`control-focus w-full border-2 border-slate-50 bg-white p-3 text-left shadow-artistic-sm transition-all hover:-translate-y-0.5 hover:bg-slate-950 ${
            snapshot.isDragging ? 'border-slate-600 opacity-90 shadow-lg shadow-black/30' : ''
          }`}
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold leading-snug text-slate-100">
              {orNa(job?.title)}
            </h4>
            {job && <SourceBadge source={job.source} />}
          </div>
          <p className="mb-2 text-xs text-slate-400">{orNa(job?.company)}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {job?.location && <span className="truncate">{job.location}</span>}
            {job?.location && <span aria-hidden="true">·</span>}
            {job?.postedAt && (
              <span className="inline-flex items-center gap-1" title={`Posted ${job.postedAt}`}>
                <CalendarDays size={11} aria-hidden="true" />
                {formatRelativeTime(job.postedAt)}
              </span>
            )}
            {job?.postedAt && <span aria-hidden="true">·</span>}
            <span>{formatRelativeTime(application.statusUpdatedAt)}</span>
          </div>
          {application.notes && (
            <p className="mt-2 truncate rounded bg-slate-800/50 px-2 py-1 text-xs text-slate-400">
              {application.notes}
            </p>
          )}
          <div className={`mt-2 h-0.5 w-full rounded-full ${colors.dot}`} aria-hidden="true" />
        </button>
      )}
    </Draggable>
  );
}
