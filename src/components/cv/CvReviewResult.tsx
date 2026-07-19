import { CheckCircle2, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '../ui/Card';
import type { CvReview } from '../../types';

function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-600';
}

interface ListSectionProps {
  title: string;
  icon: ReactNode;
  items: string[];
  emptyLabel: string;
}

function ListSection({ title, icon, items, emptyLabel }: ListSectionProps) {
  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function CvReviewResult({ review }: { review: CvReview }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Overall Score</p>
            <p className={`font-display text-5xl ${scoreColor(review.score)}`}>{review.score}<span className="text-2xl text-slate-300">/100</span></p>
          </div>
          {review.match && (
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <Target size={13} aria-hidden="true" /> Job Match
              </p>
              <p className={`font-display text-5xl ${scoreColor(review.match.matchScore)}`}>
                {review.match.matchScore}<span className="text-2xl text-slate-300">/100</span>
              </p>
              <p className="text-xs text-slate-400">{review.match.jobTitle ?? 'Untitled'} · {review.match.company ?? 'N/A'}</p>
            </div>
          )}
        </div>
        {review.summary && <p className="mt-4 text-sm leading-relaxed text-slate-600">{review.summary}</p>}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListSection
          title="Strengths"
          icon={<CheckCircle2 size={16} className="text-green-600" aria-hidden="true" />}
          items={review.strengths}
          emptyLabel="No strengths identified."
        />
        <ListSection
          title="Weaknesses"
          icon={<AlertTriangle size={16} className="text-amber-500" aria-hidden="true" />}
          items={review.weaknesses}
          emptyLabel="No weaknesses identified."
        />
      </div>

      <ListSection
        title="Suggestions"
        icon={<Lightbulb size={16} className="text-blue-500" aria-hidden="true" />}
        items={review.suggestions}
        emptyLabel="No suggestions."
      />

      {review.match && (
        <ListSection
          title="Missing Keywords for This Job"
          icon={<Target size={16} className="text-purple-500" aria-hidden="true" />}
          items={review.match.keywordGaps}
          emptyLabel="No obvious keyword gaps."
        />
      )}
    </div>
  );
}
