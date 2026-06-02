import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isRangeOverlapping(
  scheduleStartStr: string,
  scheduleEndStr: string,
  leaveStartStr: string,
  leaveEndStr: string
): boolean {
  if (!scheduleStartStr || !scheduleEndStr || !leaveStartStr || !leaveEndStr) {
    return false
  }
  
  const startA = new Date(scheduleStartStr).getTime()
  const endA = new Date(scheduleEndStr).getTime()
  
  // Since leaves are all-day and stored as YYYY-MM-DD:
  // Convert leave start and end dates to absolute time boundaries in Manila timezone (+08:00)
  const startB = new Date(`${leaveStartStr}T00:00:00+08:00`).getTime()
  const endB = new Date(`${leaveEndStr}T23:59:59+08:00`).getTime()
  
  return startA <= endB && endA >= startB
}

