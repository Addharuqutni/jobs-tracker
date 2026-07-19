import type { CvReview, CvReviewMode, Job } from '../../../shared/src';

interface PromptMessage {
  role: 'system' | 'user';
  content: string;
}

const SYSTEM_PROMPT = `Kamu adalah recruiter teknis dan reviewer CV profesional.
Analisis CV kandidat dan balas HANYA dengan objek JSON berformat tepat seperti ini:
{
  "score": number (0-100 kualitas CV keseluruhan),
  "summary": string (2-3 kalimat ringkasan),
  "strengths": string[] (3-6 poin ringkas),
  "weaknesses": string[] (3-6 poin ringkas),
  "suggestions": string[] (3-6 saran perbaikan konkret dan actionable),
  "matchScore": number (0-100, hanya jika ada target lowongan; jika tidak 0),
  "keywordGaps": string[] (skill/keyword lowongan yang hilang di CV; jika tidak ada [])
}
WAJIB: semua teks di summary, strengths, weaknesses, suggestions, dan keywordGaps dalam Bahasa Indonesia.
Jujur, spesifik, dan praktis. Jangan tulis teks di luar objek JSON.`;

export function buildCvReviewMessages(cvText: string, job: Job | null): PromptMessage[] {
  const target = job
    ? `\n\nTarget lowongan:\nPosisi: ${job.title ?? 'N/A'}\nPerusahaan: ${job.company ?? 'N/A'}\nLokasi: ${job.location ?? 'N/A'}\nNilai seberapa cocok CV dengan lowongan ini; isi matchScore dan keywordGaps (Bahasa Indonesia).`
    : '\n\nTidak ada target lowongan. Beri review umum; set matchScore ke 0 dan keywordGaps ke [].';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Isi CV:\n"""\n${cvText}\n"""${target}` },
  ];
}

function clampScore(value: unknown): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

export function parseCvReviewResponse(raw: unknown, mode: CvReviewMode, job: Job | null): CvReview {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI response was not a valid review object.');
  }
  const obj = raw as Record<string, unknown>;

  return {
    mode,
    score: clampScore(obj.score),
    summary: typeof obj.summary === 'string' ? obj.summary.trim() : '',
    strengths: stringArray(obj.strengths),
    weaknesses: stringArray(obj.weaknesses),
    suggestions: stringArray(obj.suggestions),
    match: mode === 'match' && job
      ? {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          matchScore: clampScore(obj.matchScore),
          keywordGaps: stringArray(obj.keywordGaps),
        }
      : null,
  };
}
