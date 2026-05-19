import type { MonthlySettings, DayRecord, DayInfo, MonthSummary } from '../types';
import { getJapaneseHolidays } from './holidays';

const CORE_START_MIN = 10 * 60 + 30; // 630 min
const CORE_END_MIN = 16 * 60 + 30;   // 990 min

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calcWorkHours(record: DayRecord): number {
  const start = timeToMinutes(record.startTime);
  const end = timeToMinutes(record.endTime);
  return Math.max(0, (end - start - record.breakMinutes) / 60);
}

function suggestTimes(targetWorkHours: number, breakMinutes: number): { start: string; end: string } {
  const totalMinutes = Math.round(targetWorkHours * 60) + breakMinutes;
  let startMin = 9 * 60; // default 09:00
  let endMin = startMin + totalMinutes;

  // Ensure end >= core end
  if (endMin < CORE_END_MIN) {
    endMin = CORE_END_MIN;
    startMin = endMin - totalMinutes;
  }
  // Ensure start <= core start
  if (startMin > CORE_START_MIN) {
    startMin = CORE_START_MIN;
    endMin = startMin + totalMinutes;
  }

  return { start: minutesToTime(startMin), end: minutesToTime(endMin) };
}

export function buildMonthDayInfos(
  year: number,
  month: number,
  settings: MonthlySettings,
  records: Record<string, DayRecord>,
): DayInfo[] {
  const holidays = getJapaneseHolidays(year);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // First pass: identify all working days
  const infos: DayInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidays.has(dateStr);
    const isHolidayWork = settings.holidayWorkDates.includes(dateStr);
    const isWorking = (!isWeekend && !isHoliday) || isHolidayWork;

    infos.push({
      date: dateStr,
      dayOfWeek: dow,
      isWeekend,
      isHoliday,
      holidayName: holidays.get(dateStr),
      isHolidayWork,
      isWorking,
      record: records[dateStr],
      suggestedStart: '09:00',
      suggestedEnd: '18:00',
      plannedWorkHours: 0,
    });
  }

  // Compute total target hours
  const totalTarget = settings.monthlyRegularHours +
    (settings.plan === 'overtime' ? settings.targetOvertimeHours : 0);

  // Sum actual hours from records (past actual days)
  let actualSoFar = 0;
  let actualDays = 0;
  const futureWorkingDays: number[] = []; // indices in infos

  for (let i = 0; i < infos.length; i++) {
    const info = infos[i];
    if (!info.isWorking) continue;

    const rec = records[info.date];
    if (rec?.isActual) {
      actualSoFar += calcWorkHours(rec);
      actualDays++;
    } else {
      futureWorkingDays.push(i);
    }
  }

  // Distribute remaining hours across future working days
  const remaining = Math.max(0, totalTarget - actualSoFar);
  const perDay = futureWorkingDays.length > 0
    ? remaining / futureWorkingDays.length
    : 0;

  const minDailyHours = (CORE_END_MIN - CORE_START_MIN - settings.breakMinutes) / 60;
  const dailyTarget = Math.max(minDailyHours, perDay);

  for (const idx of futureWorkingDays) {
    const { start, end } = suggestTimes(dailyTarget, settings.breakMinutes);
    infos[idx] = {
      ...infos[idx],
      suggestedStart: start,
      suggestedEnd: end,
      plannedWorkHours: dailyTarget,
    };
  }

  // For past actual days, set suggestedStart/End from record
  for (let i = 0; i < infos.length; i++) {
    const info = infos[i];
    const rec = records[info.date];
    if (rec) {
      infos[i] = {
        ...info,
        record: rec,
        suggestedStart: rec.startTime,
        suggestedEnd: rec.endTime,
        plannedWorkHours: calcWorkHours(rec),
      };
    }
  }

  return infos;
}

export function calcMonthSummary(
  year: number,
  month: number,
  settings: MonthlySettings,
  records: Record<string, DayRecord>,
): MonthSummary {
  const infos = buildMonthDayInfos(year, month, settings, records);

  const totalTarget = settings.monthlyRegularHours +
    (settings.plan === 'overtime' ? settings.targetOvertimeHours : 0);

  let actualHours = 0;
  let plannedHours = 0;
  let workedDays = 0;
  let remainingWorkingDays = 0;
  let holidayWorkHours = 0;

  for (const info of infos) {
    if (!info.isWorking) continue;
    const rec = records[info.date];
    if (rec?.isActual) {
      const h = calcWorkHours(rec);
      actualHours += h;
      workedDays++;
      if (info.isHolidayWork) holidayWorkHours += h;
    } else {
      plannedHours += info.plannedWorkHours;
      remainingWorkingDays++;
    }
  }

  const regularHours = settings.monthlyRegularHours;
  const overtimePayHours = Math.max(0, actualHours - regularHours - 30);

  return {
    totalTargetHours: totalTarget,
    actualHours,
    plannedHours,
    remainingHours: Math.max(0, totalTarget - actualHours),
    workedDays,
    remainingWorkingDays,
    holidayWorkHours,
    overtimePayHours,
  };
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}
