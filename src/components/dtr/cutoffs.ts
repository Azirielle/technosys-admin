// Cut-off periods (kinsenas): 1–15 and 16–end of month, built from today's date in Manila.

export interface Cutoff {
  id: string // "2026-11-01_2026-11-15"
  label: string // "1–15 Nov 2026"
  startDate: string
  endDate: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function makeCutoff(year: number, month: number, firstHalf: boolean): Cutoff {
  const lastDay = new Date(year, month + 1, 0).getDate()
  const from = firstHalf ? 1 : 16
  const to = firstHalf ? 15 : lastDay
  const ym = `${year}-${pad(month + 1)}`
  const startDate = `${ym}-${pad(from)}`
  const endDate = `${ym}-${pad(to)}`
  return { id: `${startDate}_${endDate}`, label: `${from}–${to} ${MONTHS[month]} ${year}`, startDate, endDate }
}

/** Today in Manila as { year, month (0-11), day }. */
function manilaToday() {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
  const [y, m, d] = ymd.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

/** The current cut-off first, then the ones before it (newest first). */
export function recentCutoffs(count = 12): Cutoff[] {
  let { year, month, day } = manilaToday()
  let firstHalf = day <= 15
  const list: Cutoff[] = []
  for (let i = 0; i < count; i++) {
    list.push(makeCutoff(year, month, firstHalf))
    if (firstHalf) {
      month -= 1
      if (month < 0) {
        month = 11
        year -= 1
      }
    }
    firstHalf = !firstHalf
  }
  return list
}
