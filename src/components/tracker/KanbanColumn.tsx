import { Droppable } from '@hello-pangea/dnd';
import { Trash2 } from 'lucide-react';
import type { Application, ApplicationStatus } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../constants';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  status: ApplicationStatus;
  applications: Application[];
  onCardClick: (application: Application) => void;
  onClearColumn: (status: ApplicationStatus) => void;
}

export function KanbanColumn({
  status,
  applications,
  onCardClick,
  onClearColumn,
}: KanbanColumnProps) {
  const colors = STATUS_COLORS[status];

  return (
    <Droppable droppableId={status}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex w-[280px] shrink-0 snap-start flex-col border-2 bg-white shadow-artistic-sm ${colors.column}`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${colors.dot}`}
                aria-hidden="true"
              />
              <h2 className="text-sm font-semibold text-slate-200">{STATUS_LABELS[status]}</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400"
                aria-label={`${applications.length} applications`}
              >
                {applications.length}
              </span>
              {applications.length > 0 && (
                <button
                  type="button"
                  aria-label={`Clear all ${STATUS_LABELS[status]} applications`}
                  onClick={() => onClearColumn(status)}
                  className="control-focus flex min-h-9 min-w-9 items-center justify-center rounded-md text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                  title={`Clear all ${STATUS_LABELS[status]}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {applications.length === 0 ? (
              <div className="flex h-24 items-center justify-center border-2 border-dashed border-slate-700 text-xs text-slate-400">
                Drag here
              </div>
            ) : (
              applications.map((app, index) => (
                <KanbanCard
                  key={app.id}
                  application={app}
                  index={index}
                  onClick={() => onCardClick(app)}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}
