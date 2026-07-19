import { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useJobs } from '../../hooks/useJobs';

const ACCEPT = '.pdf,.docx,.txt';
const ALLOWED_EXT = ['pdf', 'docx', 'txt'];
const MAX_BYTES = 5 * 1024 * 1024;

interface CvUploadProps {
  loading: boolean;
  onSubmit: (file: File, jobId?: number) => void;
}

function validate(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXT.includes(ext)) return 'Only PDF, DOCX, or TXT files are supported.';
  if (file.size > MAX_BYTES) return 'File exceeds the 5MB limit.';
  return null;
}

export function CvUpload({ loading, onSubmit }: CvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { jobs } = useJobs({ pageSize: 100, sort: 'newest' });

  function selectFile(next: File | null) {
    if (!next) return;
    const validationError = validate(next);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
  }

  function handleSubmit() {
    if (!file) return;
    onSubmit(file, jobId === '' ? undefined : Number(jobId));
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          selectFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-blue-500 bg-blue-500/5' : 'border-slate-200 bg-white'
        }`}
      >
        <span className="rotate-2 border-2 border-slate-50 bg-blue-500 p-3 text-white shadow-artistic-sm">
          <UploadCloud size={28} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-700">Drop your CV here or browse</p>
          <p className="text-xs text-slate-400">PDF, DOCX, or TXT · max 5MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Upload CV file"
          onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
      </div>

      {file && (
        <div className="flex items-center gap-3 border-2 border-slate-50 bg-white p-3 shadow-artistic-sm">
          <FileText size={18} className="text-blue-500" aria-hidden="true" />
          <span className="flex-1 truncate text-sm font-medium text-slate-700">{file.name}</span>
          <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
          <button
            type="button"
            aria-label="Remove file"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="control-focus flex min-h-9 min-w-9 items-center justify-center text-slate-400 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-slate-700">Match against a tracked job (optional)</span>
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="control-focus min-h-11 border-2 border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">General review (no job)</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title ?? 'Untitled'} · {job.company ?? 'N/A'}
            </option>
          ))}
        </select>
      </label>

      <Button type="button" variant="primary" disabled={!file || loading} onClick={handleSubmit}>
        {loading ? 'Reviewing…' : 'Review CV'}
      </Button>
    </div>
  );
}
