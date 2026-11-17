// Temporary access: which office role covers which pages, durations, and plain labels.
import { SYSTEM_MODULES, type OverrideDuration, type RoleKey } from '@/lib/overrides'

/** The two office roles the CEO can lend pages to. */
export const ROLES: { value: RoleKey; label: string }[] = [
  { value: 'hr', label: 'HR' },
  { value: 'coordinator', label: 'Service Dept' },
]

export function roleLabel(r: string) {
  return ROLES.find((x) => x.value === r)?.label ?? r
}

/** Plain page names (the module ids stay the same in the database). */
const PAGE_NAMES: Record<string, string> = {
  hr_tickets: 'Tickets and leave',
  hr_files: '201 files',
  hr_dtr: 'DTR and attendance',
  coordinator_dispatch: 'Jobs',
  coordinator_tracking: 'Live map',
  coordinator_inventory: 'Inventory',
}

export function pageName(id: string) {
  return PAGE_NAMES[id] ?? SYSTEM_MODULES.find((m) => m.id === id)?.name ?? id
}

/** Pages that belong to the other office role (the ones this role can be lent). */
export function pagesToLend(to: RoleKey) {
  return SYSTEM_MODULES.filter((m) => !m.defaultRoles.includes(to)).map((m) => ({ id: m.id, name: pageName(m.id), owner: m.defaultRoles[0] }))
}

export const DURATIONS: { value: OverrideDuration; label: string }[] = [
  { value: '1_day', label: '1 day' },
  { value: '2_days', label: '2 days' },
  { value: '7_days', label: '1 week' },
  { value: 'indefinite', label: 'Until I remove it' },
]

const DURATION_MS: Record<OverrideDuration, number | null> = {
  '1_day': 24 * 3600000,
  '2_days': 48 * 3600000,
  '7_days': 7 * 24 * 3600000,
  indefinite: null,
}

export function expiresAtFor(d: OverrideDuration) {
  const ms = DURATION_MS[d]
  return ms === null ? null : new Date(Date.now() + ms).toISOString()
}

/** "Ends in 5 h", "Ends in 2 days", "No end date". */
export function timeLeft(expiresAt: string | null) {
  if (!expiresAt) return 'No end date'
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Ended'
  const hours = Math.floor(ms / 3600000)
  if (hours < 24) return `Ends in ${Math.max(1, hours)} h`
  const days = Math.floor(hours / 24)
  return `Ends in ${days} ${days === 1 ? 'day' : 'days'}`
}
