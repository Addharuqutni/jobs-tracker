import { FileSearch } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ErrorState, LoadingCard } from '../components/ui/States';
import { CvUpload } from '../components/cv/CvUpload';
import { CvReviewResult } from '../components/cv/CvReviewResult';
import { useCvReview } from '../hooks/useCvReview';

export function CvReviewPage() {
  const { loading, error, review, submit, reset } = useCvReview();

  return (
    <div className="page-shell max-w-none">
      <div>
        <p className="mb-2 inline-block bg-purple-500 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
          AI Coach
        </p>
        <h1 className="page-heading">CV Review</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload a CV for AI feedback. Optionally match it against a job from your feed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <FileSearch size={16} aria-hidden="true" />
            Upload
          </h2>
          <CvUpload loading={loading} onSubmit={(file, jobId) => void submit(file, jobId)} />
        </Card>

        <div className="lg:col-span-7">
          {loading && (
            <div role="status" aria-busy="true" className="flex flex-col gap-4">
              <span className="sr-only">Reviewing CV</span>
              <LoadingCard />
              <LoadingCard />
            </div>
          )}
          {!loading && error && <ErrorState message={error} onRetry={reset} />}
          {!loading && !error && review && <CvReviewResult review={review} />}
          {!loading && !error && !review && (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <FileSearch size={36} className="text-slate-300" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-500">Review results appear here</p>
              <p className="text-xs text-slate-400">Upload a CV and click Review to start.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
