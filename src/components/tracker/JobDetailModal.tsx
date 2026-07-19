import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Building2, MapPin, DollarSign, Trash2 } from 'lucide-react';
import type { Application, ApplicationStatus } from '../../types';
import { APPLICATION_STATUSES, STATUS_LABELS, STATUS_COLORS } from '../../constants';
import { orNa, formatDate, formatRelativeTime } from '../../utils/format';
import { isSafeUrl } from '../../utils/url';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SourceBadge } from '../ui/SourceBadge';
import { CalendarDays } from 'lucide-react';

interface JobDetailModalProps {
  application: Application | null;
  onClose: () => void;
  onUpdateStatus: (id: number, status: ApplicationStatus) => Promise<void>;
  onUpdateNotes: (id: number, notes: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function JobDetailModal({
  application,
  onClose,
  onUpdateStatus,
  onUpdateNotes,
  onDelete,
}: JobDetailModalProps) {
  const [notes, setNotes] = useState(application?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const isDirty = useMemo(() => notes !== (application?.notes ?? ''), [notes, application?.notes]);

  useEffect(() => {
    setNotes(application?.notes ?? '');
    setConfirmDelete(false);
    setActionError(null);
    setSavedFlash(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id]);

  if (!application) return null;

  const job = application.job;
  const colors = STATUS_COLORS[application.status];

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!application) return;
    const status = e.target.value as ApplicationStatus;
    setUpdatingStatus(true);
    setActionError(null);
    try {
      await onUpdateStatus(application.id, status);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSaveNotes() {
    if (!application || !isDirty) return;
    setSaving(true);
    setActionError(null);
    try {
      await onUpdateNotes(application.id, notes);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!application) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      await onDelete(application.id);
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to delete application');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Modal open={!!application} onClose={onClose} title={orNa(job?.title)}>
      <div className="flex flex-col gap-5">
        {/* Header: company meta + source */}
        <div className="flex flex-col gap-3 rounded-none border-2 border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            {job?.company && (
              <span className="flex items-center gap-1.5">
                <Building2 size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
                <span className="font-semibold text-slate-50">{job.company}</span>
              </span>
            )}
            {job?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
                {job.location}
              </span>
            )}
            {job?.salary && (
              <span className="flex items-center gap-1.5">
                <DollarSign size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
                {job.salary}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {job && <SourceBadge source={job.source} />}
            {isSafeUrl(job?.url) && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="control-focus inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                <ExternalLink size={14} aria-hidden="true" />
                View original listing
              </a>
            )}
          </div>
        </div>

        {/* Status section */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="application-status"
            className="text-xs font-bold uppercase tracking-wide text-slate-400"
          >
            Status
          </label>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold ${colors.badge}`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${colors.dot}`} />
              {STATUS_LABELS[application.status]}
            </span>
            <select
              id="application-status"
              value={application.status}
              onChange={handleStatusChange}
              disabled={updatingStatus}
              className="field-control flex-1 py-2 text-sm"
            >
              {APPLICATION_STATUSES.map((status: ApplicationStatus) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {job?.postedAt && (
            <div className="border-2 border-slate-100 p-3">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">
                Posted at
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-50">
                <CalendarDays size={13} aria-hidden="true" />
                {formatRelativeTime(job.postedAt)}
              </span>
            </div>
          )}
          <div className="border-2 border-slate-100 p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">
              Applied at
            </span>
            <span className="font-medium text-slate-50">{formatDate(application.appliedAt)}</span>
          </div>
          <div className="border-2 border-slate-100 p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">
              Last updated
            </span>
            <span className="font-medium text-slate-50">
              {formatRelativeTime(application.statusUpdatedAt)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="app-notes"
            className="text-xs font-bold uppercase tracking-wide text-slate-400"
          >
            Notes
          </label>
          <textarea
            id="app-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="field-control p-3 text-sm"
            placeholder="Add notes about this application..."
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400" aria-live="polite">
              {savedFlash ? 'Saved' : isDirty ? 'Unsaved changes' : ''}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveNotes}
              disabled={saving || !isDirty}
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>

        {actionError && (
          <p
            role="alert"
            className="border-2 border-red-500 bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
          >
            {actionError}
          </p>
        )}

        {/* Footer: delete + close */}
        <div className="flex flex-col gap-3 border-t-2 border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Confirm deletion?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="control-focus inline-flex min-h-11 items-center gap-1.5 border-2 border-slate-50 bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-artistic-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Trash2 size={14} aria-hidden="true" />
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="control-focus inline-flex min-h-11 items-center gap-1.5 border-2 border-red-500 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          )}
          <Button variant="secondary" size="sm" className="self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
