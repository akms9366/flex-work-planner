import { useState, useEffect } from 'react';
import type { MonthlySettings, Plan } from '../types';
import { getJapaneseHolidays } from '../utils/holidays';

interface Props {
  year: number;
  month: number;
  initial?: MonthlySettings;
  onSave: (s: MonthlySettings) => void;
  onCancel?: () => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function Setup({ year, month, initial, onSave, onCancel }: Props) {
  const [plan, setPlan] = useState<Plan>(initial?.plan ?? 'ontime');
  const [regularHours, setRegularHours] = useState(
    initial?.monthlyRegularHours?.toString() ?? ''
  );
  const [overtimeHours, setOvertimeHours] = useState(
    initial?.targetOvertimeHours?.toString() ?? '45'
  );
  const [breakMin, setBreakMin] = useState(
    initial?.breakMinutes?.toString() ?? '60'
  );
  const [holidayWork, setHolidayWork] = useState<string[]>(
    initial?.holidayWorkDates ?? []
  );

  // Auto-fill regular hours based on working days
  useEffect(() => {
    if (!initial?.monthlyRegularHours) {
      const holidays = getJapaneseHolidays(year);
      const daysInMonth = new Date(year, month, 0).getDate();
      let workDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const date = new Date(year, month - 1, d);
        const dow = date.getDay();
        if (dow !== 0 && dow !== 6 && !holidays.has(dateStr)) workDays++;
      }
      setRegularHours(String(workDays * 8));
    }
  }, [year, month, initial]);

  // Build list of weekend/holiday dates for the month
  const offDays: { date: string; label: string }[] = [];
  {
    const holidays = getJapaneseHolidays(year);
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(year, month - 1, d);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const hName = holidays.get(dateStr);
      if (isWeekend || hName) {
        offDays.push({
          date: dateStr,
          label: `${d}日(${DAY_NAMES[dow]})${hName ? ` ${hName}` : ''}`,
        });
      }
    }
  }

  function toggleHolidayWork(date: string) {
    setHolidayWork(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  }

  function handleSave() {
    const rh = parseFloat(regularHours);
    const oh = parseFloat(overtimeHours);
    const bm = parseInt(breakMin);
    if (isNaN(rh) || rh <= 0) return alert('定時労働時間を正しく入力してください');
    if (plan === 'overtime' && (isNaN(oh) || oh <= 0)) return alert('残業時間を正しく入力してください');
    onSave({
      plan,
      monthlyRegularHours: rh,
      targetOvertimeHours: plan === 'overtime' ? oh : 0,
      breakMinutes: isNaN(bm) ? 60 : bm,
      holidayWorkDates: holidayWork,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="flex items-center justify-between">
          {onCancel && (
            <button onClick={onCancel} className="text-white/80 text-sm">キャンセル</button>
          )}
          <h1 className="text-lg font-bold">
            {year}年{MONTH_NAMES[month - 1]}の設定
          </h1>
          {onCancel ? <div className="w-12" /> : <div />}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Plan */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">勤務プラン</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPlan('ontime')}
              className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                plan === 'ontime'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <div className="text-2xl mb-1">🏠</div>
              定時で帰りたい
            </button>
            <button
              onClick={() => setPlan('overtime')}
              className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                plan === 'overtime'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <div className="text-2xl mb-1">💰</div>
              残業代を稼ぐ
            </button>
          </div>
        </section>

        {/* Regular hours */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">今月の定時労働時間</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={regularHours}
              onChange={e => setRegularHours(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-right w-24 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              step="0.5"
            />
            <span className="text-gray-600">時間</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            ※ 平日の稼働日数 × 1日の所定労働時間で自動計算されています
          </p>
        </section>

        {/* Overtime */}
        {plan === 'overtime' && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-3">今月の残業目標時間</h2>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={overtimeHours}
                onChange={e => setOvertimeHours(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-right w-24 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
                min="1"
                step="0.5"
              />
              <span className="text-gray-600">時間</span>
            </div>
            <div className="mt-2 p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-700">
                みなし残業 30h 込みのため、残業代が発生するのは
                <span className="font-bold">
                  {' '}{Math.max(0, parseFloat(overtimeHours || '0') - 30).toFixed(1)}時間分
                </span>
                です
              </p>
            </div>
          </section>
        )}

        {/* Break time */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">休憩時間</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={breakMin}
              onChange={e => setBreakMin(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-right w-24 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="15"
            />
            <span className="text-gray-600">分</span>
          </div>
        </section>

        {/* Holiday work dates */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-1">休日出勤日</h2>
          <p className="text-xs text-gray-400 mb-3">
            出勤する予定の土日・祝日を選択してください
          </p>
          {offDays.length === 0 ? (
            <p className="text-sm text-gray-400">土日・祝日がありません</p>
          ) : (
            <div className="space-y-2">
              {offDays.map(({ date, label }) => (
                <label key={date} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={holidayWork.includes(date)}
                    onChange={() => toggleHolidayWork(date)}
                    className="w-5 h-5 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <button
          onClick={handleSave}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-base shadow-md active:bg-blue-700 transition-colors"
        >
          保存する
        </button>
      </div>
    </div>
  );
}
