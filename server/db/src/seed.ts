import { db } from './client';
import { jobs, applications, scraperLogs } from './schema';
import type { JobSource } from '../../shared/src';

function seed(): void {
  const existing = db.select({ id: jobs.id }).from(jobs).limit(1).get();
  if (existing) {
    console.log('[db] Seed skipped — data already exists');
    return;
  }

  const dummyJobs: Array<{ title: string; company: string; location: string; url: string; salary: string | null; source: JobSource; jobId: string }> = [
    { title: 'Frontend Developer', company: 'TechCorp', location: 'Jakarta', url: 'https://jobstreet.co.id/j/1', salary: 'Rp 10-15jt', source: 'jobstreet', jobId: 'js-001' },
    { title: 'React Engineer', company: 'StartupX', location: 'Remote', url: 'https://linkedin.com/jobs/view/2', salary: null, source: 'linkedin', jobId: 'li-002' },
    { title: 'Full Stack Developer', company: 'DevHub', location: 'Bandung', url: 'https://kalibrr.com/j/3', salary: 'Rp 12-18jt', source: 'kalibrr', jobId: 'ka-003' },
    { title: 'Backend Engineer', company: 'CodeNest', location: 'Surabaya', url: 'https://glints.com/jobs/4', salary: 'Rp 8-14jt', source: 'glints', jobId: 'gl-004' },
    { title: 'Software Engineer', company: 'DataFlow', location: 'Remote', url: 'https://dealls.com/jobs/5', salary: null, source: 'dealls', jobId: 'de-005' },
  ];

  const insertedIds: number[] = [];
  for (const j of dummyJobs) {
    const result = db.insert(jobs).values(j).returning({ id: jobs.id }).get();
    if (result) insertedIds.push(result.id);
  }
  console.log(`[db] Inserted ${insertedIds.length} jobs`);

  if (insertedIds[0] !== undefined) {
    db.insert(applications).values({
      jobId: insertedIds[0],
      status: 'applied',
      appliedAt: new Date().toISOString(),
    }).run();
    console.log('[db] Inserted application: applied');
  }

  if (insertedIds[1] !== undefined) {
    db.insert(applications).values({
      jobId: insertedIds[1],
      status: 'wishlist',
    }).run();
    console.log('[db] Inserted application: wishlist');
  }

  db.insert(scraperLogs).values({
    source: 'jobstreet',
    status: 'success',
    errorMessage: null,
    jobsScrapedCount: 1,
  }).run();

  console.log('[db] Seed complete');
}

seed();
