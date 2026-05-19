import type { MonthlySettings, DayRecord } from '../types';

const SETTINGS_KEY = 'fwp_settings';
const RECORDS_KEY = 'fwp_records';

export function loadSettings(): Record<string, MonthlySettings> {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveSettings(all: Record<string, MonthlySettings>): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(all));
}

export function loadRecords(): Record<string, DayRecord> {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveRecords(all: Record<string, DayRecord>): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(all));
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
