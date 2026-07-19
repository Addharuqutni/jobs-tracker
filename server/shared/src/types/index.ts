export type JobSource = 'jobstreet' | 'linkedin' | 'kalibrr' | 'glints' | 'dealls';

export type ApplicationStatus = 'wishlist' | 'applied' | 'interview' | 'rejected' | 'offered';

export interface Job {
  id: number;
  title: string | null;
  company: string | null;
  location: string | null;
  url: string | null;
  salary: string | null;
  source: JobSource;
  jobId: string | null;
  postedAt: string | null;
  scrapedAt: string;
  hidden: number;
  createdAt: string;
}

export interface Application {
  id: number;
  jobId: number;
  status: ApplicationStatus;
  notes: string;
  appliedAt: string | null;
  statusUpdatedAt: string;
  createdAt: string;
  job?: Job;
}

export interface ScraperStatus {
  source: string;
  lastStatus: 'success' | 'error' | null;
  lastRun: string;
  jobsScraped: number;
  errorMessage: string | null;
}

export type ScraperRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ScraperLastRun {
  finishedAt: string;
  jobs: ScrapedJob[];
  logs: Array<{
    source: string;
    status: 'success' | 'error';
    errorMessage: string | null;
    jobsScrapedCount: number;
    timestamp: string;
  }>;
  portals: ScraperStatus[];
}

export interface ScraperRunResult {
  finishedAt: string;
  jobs: ScrapedJob[];
  logs: Array<{
    source: string;
    status: 'success' | 'error';
    errorMessage: string | null;
    jobsScrapedCount: number;
    timestamp: string;
  }>;
  portals: ScraperStatus[];
}

export interface ScraperRunResponse {
  runId: string;
  status: ScraperRunStatus;
  position: number | null;
  queueLength: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  result: ScraperRunResult | null;
}

export interface ScraperEnqueueResponse {
  runId: string;
  status: ScraperRunStatus;
  position: number | null;
  queueLength: number;
  message: string;
  sources: string[];
}

export interface ScraperStatusResponse {
  portals: ScraperStatus[];
  nextRun: string | null;
  isRunning: boolean;
  engine: ScraperEngine;
  pythonTool: PythonScraperTool;
  lastRun: ScraperLastRun | null;
  concurrency: number;
  queueMax: number;
  queueLength: number;
  activeCount: number;
  activeRunIds: string[];
}

export interface AnalyticsSummary {
  total: number;
  wishlist: number;
  applied: number;
  interview: number;
  offered: number;
  rejected: number;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface WeeklyTrend {
  week: string;
  applied: number;
  interview: number;
  rejected: number;
  offered: number;
}

export interface SourceEffectiveness {
  source: string;
  applied: number;
  interview: number;
  offered: number;
  rejected: number;
  interviewRate: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  current: AnalyticsSummary;
  interviewRate: number;
  offerRate: number;
  bySource: SourceCount[];
  weeklyTrend: WeeklyTrend[];
  sourceEffectiveness: SourceEffectiveness[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ScraperRunParams {
  keywords?: string[];
  sources?: JobSource[];
  engine?: ScraperEngine;
  pythonTool?: PythonScraperTool;
}

export type ScraperEngine = 'native' | 'hybrid';

export type PythonScraperTool = 'auto' | 'beautifulsoup' | 'scrapy' | 'selenium' | 'playwright';

export interface ScraperLogEntry {
  id: number;
  source: string;
  status: 'success' | 'error';
  errorMessage: string | null;
  jobsScrapedCount: number;
  timestamp: string;
}

export interface ScrapedJob {
  title: string | null;
  company: string | null;
  location: string | null;
  url: string | null;
  salary: string | null;
  source: JobSource;
  jobId: string | null;
  postedAt: string | null;
}

export interface AdapterResult {
  source: string;
  status: 'success' | 'error';
  jobs: ScrapedJob[];
  errorMessage: string | null;
  jobsScrapedCount: number;
}

export interface AdapterConfig {
  maxPages: number;
  delayMinMs: number;
  delayMaxMs: number;
  timeoutMs: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

export type CvReviewMode = 'general' | 'match';

export interface CvReviewMatch {
  jobId: number;
  jobTitle: string | null;
  company: string | null;
  matchScore: number;
  keywordGaps: string[];
}

export interface CvReview {
  mode: CvReviewMode;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  match: CvReviewMatch | null;
}
