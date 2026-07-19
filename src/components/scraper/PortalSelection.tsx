import { SOURCES, SOURCE_LABELS } from '../../constants';
import type { JobSource } from '../../types';
import { Card } from '../ui/Card';

interface PortalSelectionProps {
  selectedSources: JobSource[];
  onToggle: (source: JobSource) => void;
  disabled?: boolean;
  showDeallsWarning?: boolean;
}

export function PortalSelection({
  selectedSources,
  onToggle,
  disabled,
  showDeallsWarning,
}: PortalSelectionProps) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">Portal Selection</h2>
        <span className="text-xs text-slate-500">
          {selectedSources.length === 0
            ? 'All portals selected (default)'
            : `${selectedSources.length} portal${selectedSources.length > 1 ? 's' : ''} selected`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((source: JobSource) => {
          const checked = selectedSources.length === 0 || selectedSources.includes(source);
          return (
            <button
              type="button"
              aria-pressed={checked}
              key={source}
              onClick={() => onToggle(source)}
              disabled={disabled}
              className={`control-focus min-h-11 rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                checked
                  ? 'border-2 border-slate-50 bg-blue-500 text-white shadow-artistic-sm'
                  : 'border-2 border-slate-700 bg-white text-slate-300 hover:border-slate-50'
              }`}
            >
              {SOURCE_LABELS[source]}
            </button>
          );
        })}
      </div>
      {showDeallsWarning && (
        <p className="mt-2 text-xs text-amber-400/70">
          Dealls is fetched once, then filtered locally by title and company.
        </p>
      )}
    </Card>
  );
}
