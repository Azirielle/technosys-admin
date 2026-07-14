export type UserRole =
  | 'super_admin'
  | 'ceo'
  | 'coo'
  | 'svp'
  | 'branch_manager'
  | 'supervisor'
  | 'hr'
  | 'accountant'
  | 'coordinator'
  | 'technician'
  | 'helper'
  | 'admin';

// Modules view access list
export const MODULE_ROLES: Record<string, UserRole[]> = {
  overview: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'accountant', 'coordinator', 'branch_manager', 'supervisor'],
  employees: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'accountant', 'branch_manager', 'supervisor', 'coordinator'], // Read-only allowed for Accountant/Coordinator
  schedules: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'coordinator', 'branch_manager', 'supervisor', 'accountant', 'hr'], // Read-only for Accountant/HR to audit DTR/Leaves
  attendance: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'accountant', 'coordinator', 'branch_manager', 'supervisor'],
  leaves: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'branch_manager', 'supervisor'],
  payroll: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'accountant'],
  tickets: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'coordinator', 'branch_manager', 'supervisor'],
  inventory: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'coordinator', 'branch_manager', 'supervisor'],
  settings: ['super_admin', 'ceo', 'coo', 'admin'],
  broadcaster: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'coordinator'],
  warnings: ['super_admin', 'ceo', 'admin', 'hr', 'coordinator', 'branch_manager', 'supervisor'],
}

// Modules write/modify access list (mutations)
export const WRITE_ROLES: Record<string, UserRole[]> = {
  employees: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr'],
  schedules: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'coordinator'],
  attendance: ['super_admin', 'ceo', 'coordinator', 'branch_manager', 'supervisor'], // CEO, Super Admin, and Service Dept
  leaves: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr'], // Only HR & Execs approve leaves
  payroll: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'accountant'],
  tickets: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'coordinator', 'branch_manager', 'supervisor'],
  inventory: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'coordinator'],
  settings: ['super_admin', 'ceo', 'coo', 'admin'],
  broadcaster: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'coordinator'],
  warnings: ['super_admin', 'ceo', 'admin', 'hr', 'coordinator', 'branch_manager', 'supervisor'],
}
