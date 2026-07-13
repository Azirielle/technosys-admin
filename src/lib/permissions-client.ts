export type UserRole =
  | 'super_admin'
  | 'ceo'
  | 'svp'
  | 'branch_manager'
  | 'hr'
  | 'accountant'
  | 'coordinator'
  | 'technician'
  | 'helper'
  | 'admin';

// Modules view access list
export const MODULE_ROLES: Record<string, UserRole[]> = {
  overview: ['super_admin', 'ceo', 'svp', 'admin', 'hr', 'accountant', 'coordinator', 'branch_manager'],
  employees: ['super_admin', 'ceo', 'svp', 'admin', 'hr', 'accountant', 'branch_manager', 'coordinator'], // Read-only allowed for Accountant/Coordinator
  schedules: ['super_admin', 'ceo', 'svp', 'admin', 'coordinator', 'branch_manager', 'accountant', 'hr'], // Read-only for Accountant/HR to audit DTR/Leaves
  leaves: ['super_admin', 'ceo', 'svp', 'admin', 'hr', 'branch_manager'],
  payroll: ['super_admin', 'ceo', 'svp', 'admin', 'accountant'],
  tickets: ['super_admin', 'ceo', 'svp', 'admin', 'hr', 'coordinator', 'branch_manager'],
  inventory: ['super_admin', 'ceo', 'svp', 'admin', 'hr', 'coordinator', 'branch_manager'],
  settings: ['super_admin', 'ceo', 'admin'],
}

// Modules write/modify access list (mutations)
export const WRITE_ROLES: Record<string, UserRole[]> = {
  employees: ['super_admin', 'ceo', 'svp', 'admin', 'hr'],
  schedules: ['super_admin', 'ceo', 'svp', 'admin', 'coordinator'],
  leaves: ['super_admin', 'ceo', 'svp', 'admin', 'hr'], // Only HR & Execs approve leaves
  payroll: ['super_admin', 'ceo', 'svp', 'admin', 'accountant'],
  tickets: ['super_admin', 'ceo', 'svp', 'admin', 'hr', 'coordinator', 'branch_manager'],
  inventory: ['super_admin', 'ceo', 'svp', 'admin', 'hr', 'coordinator'],
  settings: ['super_admin', 'ceo', 'admin'],
}
