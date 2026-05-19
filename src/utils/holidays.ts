// Japanese national holidays

const EQUINOX_SPRING: Record<number, number> = {
  2020: 20, 2021: 20, 2022: 21, 2023: 21, 2024: 20,
  2025: 20, 2026: 20, 2027: 21, 2028: 20, 2029: 20, 2030: 20,
};

const EQUINOX_AUTUMN: Record<number, number> = {
  2020: 22, 2021: 23, 2022: 23, 2023: 23, 2024: 22,
  2025: 23, 2026: 23, 2027: 23, 2028: 22, 2029: 22, 2030: 23,
};

function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const d = new Date(year, month - 1, 1);
  let count = 0;
  while (true) {
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return d.getDate();
    }
    d.setDate(d.getDate() + 1);
  }
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getJapaneseHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();

  const add = (month: number, day: number, name: string) => {
    holidays.set(toKey(year, month, day), name);
  };

  // Fixed holidays
  add(1, 1, '元日');
  add(2, 11, '建国記念の日');
  add(2, 23, '天皇誕生日');
  add(4, 29, '昭和の日');
  add(5, 3, '憲法記念日');
  add(5, 4, 'みどりの日');
  add(5, 5, 'こどもの日');
  add(8, 11, '山の日');
  add(11, 3, '文化の日');
  add(11, 23, '勤労感謝の日');

  // Moving holidays
  add(1, nthWeekday(year, 1, 1, 2), '成人の日');
  add(7, nthWeekday(year, 7, 1, 3), '海の日');
  add(9, nthWeekday(year, 9, 1, 3), '敬老の日');
  add(10, nthWeekday(year, 10, 1, 2), 'スポーツの日');

  // Equinox days
  if (EQUINOX_SPRING[year]) add(3, EQUINOX_SPRING[year], '春分の日');
  if (EQUINOX_AUTUMN[year]) add(9, EQUINOX_AUTUMN[year], '秋分の日');

  // 振替休日 (substitute holidays when holiday falls on Sunday)
  const baseHolidays = new Map(holidays);
  for (const [key, name] of baseHolidays) {
    const d = new Date(key);
    if (d.getDay() === 0) { // Sunday
      let candidate = new Date(d);
      candidate.setDate(candidate.getDate() + 1);
      // Skip over existing holidays
      while (baseHolidays.has(candidate.toISOString().slice(0, 10)) ||
             holidays.has(candidate.toISOString().slice(0, 10))) {
        candidate.setDate(candidate.getDate() + 1);
      }
      holidays.set(candidate.toISOString().slice(0, 10), `振替休日（${name}）`);
    }
  }

  // 国民の休日: a weekday sandwiched between two holidays (e.g. Sept 21 if 20 and 22 are holidays)
  // Check all weekdays in the year
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toKey(year, m, d);
      if (holidays.has(key)) continue;
      const date = new Date(year, m - 1, d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const prev = new Date(date); prev.setDate(prev.getDate() - 1);
      const next = new Date(date); next.setDate(next.getDate() + 1);
      const prevKey = prev.toISOString().slice(0, 10);
      const nextKey = next.toISOString().slice(0, 10);
      if (holidays.has(prevKey) && holidays.has(nextKey)) {
        holidays.set(key, '国民の休日');
      }
    }
  }

  return holidays;
}
