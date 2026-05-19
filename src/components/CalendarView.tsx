import { useState, useMemo } from 'react';
import type { DayInfo, MonthlySettings, DayRecord, MonthSummary } from '../types';
import { buildMonthDayInfos, calcMonthSummary, formatHours } from '../utils/calculations';
import DayModal from './DayModal';

interface Props {
  year: number;
  month: number;
  settings: MonthlySettings;
  records: Record<string, DayRecord>;
  onRecordChange: (date: string, record: DayRecord | null) => void;
  onOpenSettings: () => void;
  onMonthChange: (year: number, month: number) => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function SummaryBar({ summary, plan }: { summary: MonthSummary; plan: string }) {
  const progress = summary.totalTargetHours > 0
    ? Math.min(1, summary.actualHours / summary.totalTargetHours)
    : 0;
  const progressPct = Math.round(progress * 100);

  return (
    <div className="bg-white px-4 py-3 shadow-sm">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>実績 <span className="font-bold text-gray-800">{formatHours(summary.actualHours)}</span></span>
        <span>目標 <span className="font-bold text-gray-800">{formatHours(summary.totalTargetHours)}</span></span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all ${plan === 'overtime' ? 'bg-orange-500' : 'bg-blue-500'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs">
        <span className="text-gray-500">残り <span className="font-bold text-gray-700">{formatHours(summary.remainingHours)}</span></span>
        <span className="text-gray-400">{progressPct}% 達成</span>
        <span className="text-gray-500">残業日数 <span className="font-bold text-gray-700">{summary.remainingWorkingDays}日</span></span>
      </div>
      {plan === 'overtime' && summary.actualHours > 0 && (
        <div className="mt-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1">
          残業代発生時間: <span className="font-bold">{formatHours(summary.overtimePayHours)}</span>
          {summary.holidayWorkHours > 0 && (
            <> / 休日労働: <span className="font-bold">{formatHours(summary.holidayWorkHours)}</span></>
          )}
        </div>
      )}
    </div>
  );
}

function DayCard({
  info,
  isToday,
  onClick,
}: {
  info: DayInfo;
  isToday: boolean;
  onClick: () => void;
}) {
  const d = new Date(info.date + 'T00:00:00');
  const dayNum = d.getDate();
  const dow = info.dayOfWeek;

  if (!info.isWorking && !info.isHolidayWork) {
    // Non-working day
    return (
      <div className={`px-4 py-2 flex items-center border-b border-gray-100
        ${info.isHoliday ? 'bg-red-50' : 'bg-gray-50'}`}
      >
        <div className="w-12">
          <span className={`text-sm font-medium ${
            dow === 0 || info.isHoliday ? 'text-red-400' : 'text-blue-400'
          }`}>
            {dayNum}日
          </span>
          <span className={`text-xs ml-1 ${
            dow === 0 || info.isHoliday ? 'text-red-300' : 'text-blue-300'
          }`}>({DAY_NAMES[dow]})</span>
        </div>
        <div className="flex-1 ml-3">
          {info.holidayName ? (
            <span className="text-xs text-red-400">{info.holidayName}</span>
          ) : (
            <span className="text-xs text-gray-300">休日</span>
          )}
        </div>
      </div>
    );
  }

  const rec = info.record;
  const isActual = rec?.isActual ?? false;
  const start = rec?.startTime ?? info.suggestedStart;
  const end = rec?.endTime ?? info.suggestedEnd;
  const workHours = info.plannedWorkHours;

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center border-b border-gray-100 text-left active:bg-gray-50 transition-colors ${
        isToday ? 'bg-blue-50' : info.isHolidayWork ? 'bg-orange-50' : 'bg-white'
      }`}
    >
      <div className="w-14 flex-none">
        <div className={`text-sm font-bold ${
          dow === 0 || info.isHoliday ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-800'
        }`}>
          {dayNum}日
          {isToday && <span className="ml-1 text-xs text-blue-600">今日</span>}
        </div>
        <div className="text-xs text-gray-400">({DAY_NAMES[dow]})</div>
      </div>

      <div className="flex-1 mx-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isActual ? 'text-green-700' : 'text-gray-600'}`}>
            {start} 〜 {end}
          </span>
          {isActual && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">実績</span>
          )}
          {info.isHolidayWork && (
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">休出</span>
          )}
        </div>
        {info.holidayName && (
          <div className="text-xs text-red-400 mt-0.5">{info.holidayName}</div>
        )}
      </div>

      <div className="flex-none text-right">
        <div className={`text-base font-bold ${isActual ? 'text-green-600' : 'text-gray-500'}`}>
          {formatHours(workHours)}
        </div>
        <div className="text-gray-300 text-sm">›</div>
      </div>
    </button>
  );
}

export default function CalendarView({
  year, month, settings, records, onRecordChange, onOpenSettings, onMonthChange
}: Props) {
  const [selectedInfo, setSelectedInfo] = useState<DayInfo | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayInfos = useMemo(
    () => buildMonthDayInfos(year, month, settings, records),
    [year, month, settings, records]
  );

  const summary: MonthSummary = useMemo(
    () => calcMonthSummary(year, month, settings, records),
    [year, month, settings, records]
  );

  function prevMonth() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={prevMonth} className="text-white/80 w-8 h-8 flex items-center justify-center text-xl">‹</button>
        <div className="text-center">
          <div className="text-lg font-bold">{year}年{MONTH_NAMES[month - 1]}</div>
          <div className="text-xs text-white/70">
            {settings.plan === 'ontime' ? '定時プラン' : '残業プラン'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={nextMonth} className="text-white/80 w-8 h-8 flex items-center justify-center text-xl">›</button>
          <button
            onClick={onOpenSettings}
            className="text-white/80 w-8 h-8 flex items-center justify-center"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Summary */}
      <SummaryBar summary={summary} plan={settings.plan} />

      {/* Day list */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white">
          {dayInfos.map(info => {
            const infoDate = new Date(info.date + 'T00:00:00');
            const isToday = infoDate.getTime() === today.getTime();
            return (
              <DayCard
                key={info.date}
                info={info}
                isToday={isToday}
                onClick={() => info.isWorking && setSelectedInfo(info)}
              />
            );
          })}
        </div>
        <div className="h-8" />
      </div>

      {/* Day editor modal */}
      {selectedInfo && (
        <DayModal
          info={selectedInfo}
          breakMinutes={settings.breakMinutes}
          onSave={record => {
            onRecordChange(selectedInfo.date, record);
            setSelectedInfo(null);
          }}
          onDelete={() => {
            onRecordChange(selectedInfo.date, null);
          }}
          onClose={() => setSelectedInfo(null)}
        />
      )}
    </div>
  );
}
