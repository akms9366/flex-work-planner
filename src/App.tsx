import { useState, useCallback } from 'react';
import type { MonthlySettings, DayRecord } from './types';
import {
  loadSettings, saveSettings, loadRecords, saveRecords, monthKey
} from './utils/storage';
import Setup from './components/Setup';
import CalendarView from './components/CalendarView';

type View = 'setup' | 'calendar';

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [allSettings, setAllSettings] = useState<Record<string, MonthlySettings>>(loadSettings);
  const [allRecords, setAllRecords] = useState<Record<string, DayRecord>>(loadRecords);
  const [view, setView] = useState<View>(() => {
    const key = monthKey(now.getFullYear(), now.getMonth() + 1);
    const s = loadSettings();
    return s[key] ? 'calendar' : 'setup';
  });

  const mk = monthKey(year, month);
  const currentSettings = allSettings[mk];

  // Records for this month
  const monthRecords = useCallback(() => {
    const prefix = mk + '-';
    const result: Record<string, DayRecord> = {};
    for (const [k, v] of Object.entries(allRecords)) {
      if (k.startsWith(prefix)) result[k] = v;
    }
    return result;
  }, [allRecords, mk]);

  function handleSaveSettings(s: MonthlySettings) {
    const updated = { ...allSettings, [mk]: s };
    setAllSettings(updated);
    saveSettings(updated);
    setView('calendar');
  }

  function handleRecordChange(date: string, record: DayRecord | null) {
    const updated = { ...allRecords };
    if (record === null) {
      delete updated[date];
    } else {
      updated[date] = record;
    }
    setAllRecords(updated);
    saveRecords(updated);
  }

  function handleMonthChange(y: number, m: number) {
    setYear(y);
    setMonth(m);
    const key = monthKey(y, m);
    if (!allSettings[key]) {
      setView('setup');
    } else {
      setView('calendar');
    }
  }

  if (view === 'setup' || !currentSettings) {
    return (
      <Setup
        year={year}
        month={month}
        initial={currentSettings}
        onSave={handleSaveSettings}
        onCancel={currentSettings ? () => setView('calendar') : undefined}
      />
    );
  }

  return (
    <CalendarView
      year={year}
      month={month}
      settings={currentSettings}
      records={monthRecords()}
      onRecordChange={handleRecordChange}
      onOpenSettings={() => setView('setup')}
      onMonthChange={handleMonthChange}
    />
  );
}
