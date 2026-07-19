export function extractJobIdFromUrl(url: string, pattern: RegExp): string | null {
  const match = url.match(pattern);
  return match?.[1] ?? null;
}

export function buildJobStreetUrl(keyword: string, page: number): string {
  const slug = encodeURIComponent(keyword.trim().toLowerCase()).replace(/%20/g, '-');
  return `https://id.jobstreet.com/id/${slug}-jobs?page=${page}`;
}

export function buildLinkedInUrl(keyword: string, start: number): string {
  const params = new URLSearchParams({
    keywords: keyword.trim(),
    geoId: '102478259',
    start: String(start),
  });
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;
}

export function buildKalibrrUrl(keyword: string): string {
  return `https://www.kalibrr.com/home/tex/job?text=${encodeURIComponent(keyword)}`;
}

export function buildGlintsUrl(): string {
  return 'https://glints.com/id/opportunities/jobs/explore?country=ID&locationName=All%20Cities/Provinces';
}

export function buildDeallsUrl(page: number, limit: number = 18): string {
  return `https://dealls.com/v1/explore-job/job?limit=${limit}&page=${page}&status=active&published=true`;
}

export function prependBase(base: string, path: string): string {
  if (path.startsWith('http')) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
