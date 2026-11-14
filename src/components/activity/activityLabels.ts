// Plain names for activity log areas (the target_category values the app writes) and roles.

export const AREAS: Record<string, string> = {
  tickets: 'Tickets',
  leaves: 'Leave',
  audit: 'DTR',
  employee: '201 files',
  compliance: 'Policies',
  announcements: 'Announcements',
  schedule: 'Scheduling',
  casual_helpers: 'Temporary workers',
  inventory: 'Inventory',
  tracking: 'Live map',
  system_overrides: 'Temporary access',
}

export function areaLabel(category: string) {
  return AREAS[category] ?? category.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/** Filter groups shown as tabs. */
export const GROUPS: { value: string; label: string; areas: string[] | null }[] = [
  { value: 'all', label: 'Everything', areas: null },
  { value: 'hr', label: 'HR', areas: ['tickets', 'leaves', 'audit', 'employee', 'compliance'] },
  { value: 'service', label: 'Service Dept', areas: ['schedule', 'casual_helpers', 'inventory', 'tracking'] },
  { value: 'access', label: 'Temporary access', areas: ['system_overrides'] },
]

const ROLES: Record<string, string> = { ceo: 'CEO', hr: 'HR', coordinator: 'Service Dept', technician: 'Technician', helper: 'Helper', system: 'System' }

export function roleName(role: string | null | undefined) {
  return (role && ROLES[role]) || 'Staff'
}
