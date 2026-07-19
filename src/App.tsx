import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingCard } from './components/ui/States';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const FeedPage = lazy(() => import('./pages/FeedPage').then((module) => ({ default: module.FeedPage })));
const TrackerPage = lazy(() => import('./pages/TrackerPage').then((module) => ({ default: module.TrackerPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const CvReviewPage = lazy(() => import('./pages/CvReviewPage').then((module) => ({ default: module.CvReviewPage })));

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Suspense
          fallback={
            <div className="p-4 sm:p-6" role="status">
              <span className="sr-only">Loading page</span>
              <LoadingCard />
            </div>
          }
        >
          <Routes>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/tracker" element={<TrackerPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/cv-review" element={<CvReviewPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}
