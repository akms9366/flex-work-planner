export type Plan = 'ontime' | 'overtime';

export interface MonthlySettings {
  plan: Plan;
  monthlyRegularHours: number;
  targetOvertimeHours: number;
  breakMinutes: number;
  holidayWorkDates: string[]; // YYYY-MM-DD
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
  isActual: boolean;
  isHolidayWork: boolean;
}

export interface DayInfo {
  date: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isHolidayWork: boolean;
  isWorking: boolean;
  record?: DayRecord;
  suggestedStart: string;
  suggestedEnd: string;
  plannedWorkHours: number;
}

export interface MonthSummary {
  totalTargetHours: number;
  actualHours: number;
  plannedHours: number;
  remainingHours: number;
  workedDays: number;
  remainingWorkingDays: number;
  holidayWorkHours: number;
  overtimePayHours: number;
}
