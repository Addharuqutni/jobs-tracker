import type { JobSource } from '../../types';
import { SOURCE_BADGE_CLASSES, SOURCE_DOT_CLASSES, SOURCE_LABELS } from '../../constants';

interface SourceBadgeProps {
  source: JobSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-current/10 px-2.5 py-1 text-xs font-semibold ${SOURCE_BADGE_CLASSES[source]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${SOURCE_DOT_CLASSES[source]}`}
        aria-hidden="true"
      />
      {SOURCE_LABELS[source]}
    </span>
  );
}
