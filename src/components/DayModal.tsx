import { useState } from 'react';
import type { DayInfo, DayRecord } from '../types';
import { calcWorkHours, formatHours, timeToMinutes, minutesToTime } from '../utils/calculations';

interface Props {
  info: DayInfo;
  breakMinutes: number;
  onSave: (record: DayRecord) => void;
  onDelete: () => void;
  onClose: () => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日(${DAY_NAMES[d.getDay()]})`;
}

const CORE_START = '10:30';
const CORE_END = '16:30';

export default function DayModal({ info, breakMinutes, onSave, onDelete, onClose }: Props) {
  const existing = info.record;
  const [startTime, setStartTime] = useState(existing?.startTime ?? info.suggestedStart);
  const [endTime, setEndTime] = useState(existing?.endTime ?? info.suggestedEnd);
  const [breakMin, setBreakMin] = useState(existing?.breakMinutes ?? breakMinutes);
  const [isActual, setIsActual] = useState(existing?.isActual ?? false);

  const tempRecord: DayRecord = {
    date: info.date,
    startTime,
    endTime,
    breakMinutes: breakMin,
    isActual,
    isHolidayWork: info.isHolidayWork,
  };
  const workHours = calcWorkHours(tempRecord);

  function validateAndSave() {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const coreStart = timeToMinutes(CORE_START);
    const coreEnd = timeToMinutes(CORE_END);

    if (endMin <= startMin) {
      alert('終了時刻は開始時刻より後にしてください');
      return;
    }
    if (startMin > coreStart) {
      alert(`コアタイム(${CORE_START})より後には開始できません`);
      return;
    }
    if (endMin < coreEnd) {
      alert(`コアタイム(${CORE_END})より前には終了できません`);
      return;
    }
    onSave(tempRecord);
  }

  // Time increment/decrement helpers
  function adjustTime(
    current: string,
    setter: (v: string) => void,
    deltaMin: number
  ) {
    const m = timeToMinutes(current) + deltaMin;
    if (m < 0 || m > 24 * 60) return;
    setter(minutesToTime(m));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl shadow-xl pb-safe"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div>
            <div className="font-bold text-gray-800">{formatDate(info.date)}</div>
            {info.isHolidayWork && (
              <span className="text-xs text-orange-600 font-medium">休日出勤</span>
            )}
            {info.holidayName && !info.isHolidayWork && (
              <span className="text-xs text-red-500">{info.holidayName}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Core time notice */}
          <div className="bg-blue-50 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-700">
              コアタイム: {CORE_START} 〜 {CORE_END}（必須勤務）
            </p>
          </div>

          {/* Start time */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">開始時刻</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustTime(startTime, setStartTime, -30)}
                className="w-10 h-10 bg-gray-100 rounded-full text-lg font-bold text-gray-600 active:bg-gray-200"
              >−</button>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-xl font-bold text-center w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => adjustTime(startTime, setStartTime, 30)}
                className="w-10 h-10 bg-gray-100 rounded-full text-lg font-bold text-gray-600 active:bg-gray-200"
              >+</button>
              <span className="text-xs text-gray-400 ml-1">
                ※{CORE_START}以前
              </span>
            </div>
          </div>

          {/* End time */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">終了時刻</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustTime(endTime, setEndTime, -30)}
                className="w-10 h-10 bg-gray-100 rounded-full text-lg font-bold text-gray-600 active:bg-gray-200"
              >−</button>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-xl font-bold text-center w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => adjustTime(endTime, setEndTime, 30)}
                className="w-10 h-10 bg-gray-100 rounded-full text-lg font-bold text-gray-600 active:bg-gray-200"
              >+</button>
              <span className="text-xs text-gray-400 ml-1">
                ※{CORE_END}以降
              </span>
            </div>
          </div>

          {/* Break */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">休憩時間（分）</label>
            <input
              type="number"
              value={breakMin}
              onChange={e => setBreakMin(parseInt(e.target.value) || 0)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold w-24 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="15"
            />
          </div>

          {/* Work hours preview */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">実働時間</span>
            <span className={`text-xl font-bold ${workHours >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {formatHours(workHours)}
            </span>
          </div>

          {/* Mark as actual */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActual}
              onChange={e => setIsActual(e.target.checked)}
              className="w-5 h-5 accent-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">実績として記録する</span>
              <p className="text-xs text-gray-400">チェックすると確定済みとして扱われ、残日数が再計算されます</p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="px-4 pb-6 pt-2 flex gap-2">
          {existing && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="flex-none px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium active:bg-red-100"
            >
              削除
            </button>
          )}
          <button
            onClick={validateAndSave}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-base active:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
