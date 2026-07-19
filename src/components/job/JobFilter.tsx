import { Search, MapPin, ArrowUpDown } from 'lucide-react';
import { SOURCES, SOURCE_LABELS } from '../../constants';
import type { JobSource } from '../../types';

interface JobFilterProps {
  keyword: string;
  location: string;
  selectedSources: string[];
  sort: 'newest' | 'title' | 'company';
  onKeywordChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSourceToggle: (source: string) => void;
  onSortChange: (sort: 'newest' | 'title' | 'company') => void;
}

export function JobFilter({
  keyword,
  location,
  selectedSources,
  sort,
  onKeywordChange,
  onLocationChange,
  onSourceToggle,
  onSortChange,
}: JobFilterProps) {
  return (
    <section
      aria-label="Job filters"
      className="flex flex-col gap-4 border-2 border-slate-50 bg-white p-4 shadow-artistic"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <label className="md:col-span-5">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Search
          </span>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search keyword..."
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              className="field-control w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </label>
        <label className="md:col-span-3">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sort
          </span>
          <div className="relative">
            <ArrowUpDown
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
              aria-hidden="true"
            />
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as typeof sort)}
              className="field-control w-full appearance-none py-2 pl-9 pr-3 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="title">Title A-Z</option>
              <option value="company">Company A-Z</option>
            </select>
          </div>
        </label>
        <label className="md:col-span-4">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Location
          </span>
          <div className="relative">
            <MapPin
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Location..."
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="field-control w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </label>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
        <span className="flex min-h-11 items-center text-xs font-semibold uppercase tracking-wide text-slate-400">
          Portals
        </span>
        {SOURCES.map((source: JobSource) => {
          const checked = selectedSources.includes(source);
          return (
            <button
              key={source}
              onClick={() => onSourceToggle(source)}
              type="button"
              aria-pressed={checked}
              className={`control-focus min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                checked
                  ? 'border-slate-50 bg-blue-500 text-white shadow-artistic-sm'
                  : 'border-slate-700 bg-white text-slate-300 hover:border-slate-50 hover:bg-slate-950 hover:text-slate-50'
              }`}
            >
              {SOURCE_LABELS[source]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
