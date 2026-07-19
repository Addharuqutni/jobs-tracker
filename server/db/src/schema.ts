import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type { JobSource, ApplicationStatus } from '../../shared/src';

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title'),
  company: text('company'),
  location: text('location'),
  url: text('url'),
  salary: text('salary'),
  source: text('source').notNull().$type<JobSource>(),
  jobId: text('job_id'),
  postedAt: text('posted_at'),
  scrapedAt: text('scraped_at').notNull().default(sql`datetime('now')`),
  hidden: integer('hidden').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
}, (table) => ({
  sourceIdx: index('idx_jobs_source').on(table.source),
  hiddenIdx: index('idx_jobs_hidden').on(table.hidden),
  scrapedAtIdx: index('idx_jobs_scraped_at').on(table.scrapedAt),
  postedAtIdx: index('idx_jobs_posted_at').on(table.postedAt),
  urlIdx: uniqueIndex('idx_jobs_url_unique').on(table.url).where(sql`${table.url} IS NOT NULL`),
  sourceJobIdIdx: uniqueIndex('idx_jobs_source_job_id').on(table.source, table.jobId),
}));

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['wishlist', 'applied', 'interview', 'rejected', 'offered'] }).notNull().default('wishlist').$type<ApplicationStatus>(),
  notes: text('notes').default(''),
  appliedAt: text('applied_at'),
  statusUpdatedAt: text('status_updated_at').notNull().default(sql`datetime('now')`),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
}, (table) => ({
  statusIdx: index('idx_applications_status').on(table.status),
  jobIdIdx: uniqueIndex('idx_applications_job_id_unique').on(table.jobId),
  statusUpdatedAtIdx: index('idx_applications_status_updated_at').on(table.statusUpdatedAt),
}));

export const scraperLogs = sqliteTable('scraper_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(),
  status: text('status', { enum: ['success', 'error'] }).notNull(),
  errorMessage: text('error_message'),
  jobsScrapedCount: integer('jobs_scraped_count').notNull().default(0),
  timestamp: text('timestamp').notNull().default(sql`datetime('now')`),
}, (table) => ({
  sourceTimestampIdx: index('idx_scraper_logs_source_timestamp').on(table.source, table.timestamp),
}));
