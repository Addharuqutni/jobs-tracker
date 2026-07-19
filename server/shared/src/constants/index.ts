import type { ApplicationStatus, JobSource } from '../types';

export const SOURCES: JobSource[] = [
  'jobstreet',
  'linkedin',
  'kalibrr',
  'glints',
  'dealls',
];

export const SOURCE_LABELS: Record<JobSource, string> = {
  jobstreet: 'JobStreet',
  linkedin: 'LinkedIn',
  kalibrr: 'Kalibrr',
  glints: 'Glints',
  dealls: 'Dealls',
};

export const SOURCE_BADGE_CLASSES: Record<JobSource, string> = {
  jobstreet: 'bg-blue-500/20 text-blue-400',
  linkedin: 'bg-sky-500/20 text-sky-400',
  kalibrr: 'bg-purple-500/20 text-purple-400',
  glints: 'bg-orange-500/20 text-orange-400',
  dealls: 'bg-pink-500/20 text-pink-400',
};

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'interview',
  'rejected',
  'offered',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interview: 'Interview',
  rejected: 'Rejected',
  offered: 'Offered',
};

export const STATUS_COLORS: Record<
  ApplicationStatus,
  { badge: string; column: string; dot: string }
> = {
  wishlist: {
    badge: 'bg-blue-500/20 text-blue-400',
    column: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  applied: {
    badge: 'bg-yellow-500/20 text-yellow-400',
    column: 'border-yellow-500/30',
    dot: 'bg-yellow-500',
  },
  interview: {
    badge: 'bg-green-500/20 text-green-400',
    column: 'border-green-500/30',
    dot: 'bg-green-500',
  },
  offered: {
    badge: 'bg-emerald-500/20 text-emerald-400',
    column: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  rejected: {
    badge: 'bg-red-500/20 text-red-400',
    column: 'border-red-500/30',
    dot: 'bg-red-500',
  },
};

export const KANBAN_COLUMN_ORDER: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'interview',
  'offered',
  'rejected',
];
