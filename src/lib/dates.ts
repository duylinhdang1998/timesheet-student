import { addDays, addMonths, format, getDay, parse } from 'date-fns'

// Dates travel as ISO strings (yyyy-MM-dd), times as HH:mm. Everything is Vietnam time.
const ISO = 'yyyy-MM-dd'

/** How far ahead the schedule reaches: pickers stop here and open-ended series are created this far. */
export const HORIZON_MONTHS = 60

/** Latest date a picker offers (IonDatetime's own default would stop this December). */
export function maxPickDate(): string {
  return addMonthsISO(todayVN(), HORIZON_MONTHS)
}

export function todayVN(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

/** Current Vietnam time, "HH:mm" (comparable with session times as strings). */
export function nowTimeVN(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
}

export function parseISODate(iso: string): Date {
  return parse(iso, ISO, new Date())
}

export function toISODate(date: Date): string {
  return format(date, ISO)
}

export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(parseISODate(iso), days))
}

export function addMonthsISO(iso: string, months: number): string {
  return toISODate(addMonths(parseISODate(iso), months))
}

export function datesBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDaysISO(d, 1)) out.push(d)
  return out
}

const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const DOW_LONG = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

/** "T3, 07/10" */
export function formatDayShort(iso: string): string {
  const d = parseISODate(iso)
  return `${DOW_SHORT[getDay(d)]}, ${format(d, 'dd/MM')}`
}

/** "Thứ 3, 07/10/2026" */
export function formatDayLong(iso: string): string {
  const d = parseISODate(iso)
  return `${DOW_LONG[getDay(d)]}, ${format(d, 'dd/MM/yyyy')}`
}

export function formatDate(iso: string): string {
  return format(parseISODate(iso), 'dd/MM/yyyy')
}

/** ISO weekday: 1 = Monday … 7 = Sunday */
export function isoWeekday(iso: string): number {
  const dow = getDay(parseISODate(iso))
  return dow === 0 ? 7 : dow
}

export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const
export function weekdayLabel(isoDay: number): string {
  return isoDay === 7 ? 'CN' : `T${isoDay + 1}`
}

/** "17:30:00" → "17:30" */
export function hhmm(time: string): string {
  return time.slice(0, 5)
}

const DOW_NAME = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

/** "Thứ Sáu" */
export function weekdayName(iso: string): string {
  return DOW_NAME[getDay(parseISODate(iso))]
}

/** "Thứ Sáu, 09/10" */
export function formatDayTitle(iso: string): string {
  return `${weekdayName(iso)}, ${format(parseISODate(iso), 'dd/MM')}`
}

/** "Thứ Sáu, 9 tháng 10" */
export function formatDayFull(iso: string): string {
  const d = parseISODate(iso)
  return `${weekdayName(iso)}, ${d.getDate()} tháng ${d.getMonth() + 1}`
}

/** Monday of the week containing `iso` */
export function weekStart(iso: string): string {
  return addDaysISO(iso, 1 - isoWeekday(iso))
}

/** "05 – 11 tháng 10", or "29/09 – 05/10" across two months */
export function formatWeekRange(monday: string): string {
  const a = parseISODate(monday)
  const b = parseISODate(addDaysISO(monday, 6))
  if (a.getMonth() === b.getMonth()) return `${format(a, 'dd')} – ${format(b, 'dd')} tháng ${b.getMonth() + 1}`
  return `${format(a, 'dd/MM')} – ${format(b, 'dd/MM')}`
}

/** [1, 3, 5] → "Thứ 2, 4, 6"; Sunday reads "CN" */
export function formatWeekdays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  const nums = sorted.filter((d) => d < 7).map((d) => String(d + 1))
  const parts = nums.length ? [`Thứ ${nums.join(', ')}`] : []
  if (sorted.includes(7)) parts.push('CN')
  return parts.join(', ')
}
