import { APPLICATION_STATUSES, SOURCES } from '../../../shared/src';
import type { ApplicationStatus, JobSource } from '../../../shared/src';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function optionalQueryString(value: unknown, name: string, maxLength = 100): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new Error(`${name} must be a string with at most ${maxLength} characters`);
  }
  return value;
}

export function parseJobSource(value: unknown, name = 'source'): JobSource | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !SOURCES.includes(value as JobSource)) {
    throw new Error(`${name} must be one of: ${SOURCES.join(', ')}`);
  }
  return value as JobSource;
}

export function parseJobSources(value: unknown): JobSource[] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`source must be one of: ${SOURCES.join(', ')}`);
  }
  const sources = value.split(',').map((s) => s.trim()).filter(Boolean);
  if (sources.length === 0 || sources.some((s) => !SOURCES.includes(s as JobSource))) {
    throw new Error(`source must be one of: ${SOURCES.join(', ')}`);
  }
  return sources as JobSource[];
}

export function parseStatuses(value: unknown, name = 'status'): ApplicationStatus[] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} must be a comma-separated status list`);
  }
  const statuses = value.split(',');
  if (statuses.some((status) => !APPLICATION_STATUSES.includes(status as ApplicationStatus))) {
    throw new Error(`${name} contains an invalid status`);
  }
  return statuses as ApplicationStatus[];
}

export function parseDate(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD format`);
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${name} must use YYYY-MM-DD format`);
  }
  return value;
}

export function validateDateRange(from: string | undefined, to: string | undefined): void {
  if (from && to && from > to) throw new Error('from must not be later than to');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parsePositiveId(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export type JobSort = 'newest' | 'title' | 'company';

export function parseSort(value: unknown): JobSort {
  if (value === undefined) return 'newest';
  if (value !== 'newest' && value !== 'title' && value !== 'company') {
    throw new Error('sort must be one of: newest, title, company');
  }
  return value;
}
