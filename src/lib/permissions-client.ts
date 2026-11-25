// The five roles that exist in the company (matches the user_role type in the database).
export type UserRole = 'ceo' | 'hr' | 'coordinator' | 'technician' | 'helper';

export type OfficeRole = Extract<UserRole, 'ceo' | 'hr' | 'coordinator'>;

// Who can open each module.
export const MODULE_ROLES: Record<string, UserRole[]> = {
  overview: ['ceo', 'hr', 'coordinator'],
  employees: ['ceo', 'hr', 'coordinator'], // Coordinator reads 201 files to build crews
  schedules: ['ceo', 'hr', 'coordinator'], // HR reads schedules to check DTR and leaves
  attendance: ['ceo', 'hr', 'coordinator'],
  leaves: ['ceo', 'hr'],
  tickets: ['ceo', 'hr', 'coordinator'],
  inventory: ['ceo', 'coordinator'], // tools are the Coordinator's only (client, Nov 2026)
  settings: ['ceo'],
  broadcaster: ['ceo', 'hr', 'coordinator'],
  warnings: ['ceo', 'hr', 'coordinator'],
  app_management: ['ceo'],
  policies: ['ceo', 'hr'],
}

// Who can change data in each module.
export const WRITE_ROLES: Record<string, UserRole[]> = {
  employees: ['ceo', 'hr'],
  schedules: ['ceo', 'coordinator'],
  attendance: ['ceo', 'hr', 'coordinator'], // DTR corrections
  leaves: ['ceo', 'hr'],
  tickets: ['ceo', 'hr', 'coordinator'],
  inventory: ['ceo', 'coordinator'], // tools are the Coordinator's only (client, Nov 2026)
  settings: ['ceo'],
  broadcaster: ['ceo', 'hr', 'coordinator'],
  warnings: ['ceo', 'hr', 'coordinator'],
  app_management: ['ceo'],
  policies: ['ceo', 'hr'],
}
