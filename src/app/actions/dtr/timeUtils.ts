// Helpers for Philippine Time (UTC+8)
export function getManilaDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);
}

export function getManilaTimeString(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function getManilaDayOfWeek(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  }).format(date);
}

export function getManilaHourAndMinute(date: Date): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  let hours = 0;
  let minutes = 0;
  for (const p of parts) {
    if (p.type === 'hour') hours = parseInt(p.value, 10);
    if (p.type === 'minute') minutes = parseInt(p.value, 10);
  }
  if (hours === 24) hours = 0;
  return { hours, minutes };
}

// Calculate Night Shift Differential (22:00 to 06:00 Asia/Manila)
export function calculateNightDiffHours(inDate: Date, outDate: Date): number {
  if (outDate <= inDate) return 0;
  
  let totalNdMs = 0;
  // Iterate by 30-minute slices or mathematical intervals
  // Since shifts are typically <= 24 hours, check 30m steps
  const STEP_MS = 15 * 60 * 1000; // 15-minute resolution
  let current = inDate.getTime();
  const end = outDate.getTime();

  while (current < end) {
    const next = Math.min(current + STEP_MS, end);
    const midDate = new Date((current + next) / 2);
    const { hours } = getManilaHourAndMinute(midDate);
    
    // Philippine Labor Code Art. 86: 10:00 PM (22:00) to 6:00 AM (06:00)
    if (hours >= 22 || hours < 6) {
      totalNdMs += (next - current);
    }
    current = next;
  }

  return totalNdMs / (1000 * 60 * 60);
}

// Generate array of YYYY-MM-DD dates between start and end inclusive
export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDateStr}T12:00:00+08:00`);
  const end = new Date(`${endDateStr}T12:00:00+08:00`);

  while (curr <= end) {
    dates.push(getManilaDateString(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}
