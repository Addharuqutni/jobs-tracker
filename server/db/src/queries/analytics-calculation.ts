import type { ApplicationStatus } from '../../../shared/src';

export function calculateFunnel(rows: Array<{ status: ApplicationStatus; appliedAt: string | null }>) {
  return rows.reduce((result, row) => {
    if (row.appliedAt || row.status !== 'wishlist') result.applied += 1;
    if (row.status === 'interview' || row.status === 'offered') result.interview += 1;
    if (row.status === 'offered') result.offered += 1;
    return result;
  }, { applied: 0, interview: 0, offered: 0 });
}
