import { getSystemOverrides, RoleKey, SYSTEM_MODULES } from './overrides';

export type AdminActivityItem = {
  id: string;
  adminName: string;
  adminRole: string;
  adminRoleKey: RoleKey | 'ceo';
  moduleName: string;
  moduleKey: string;
  department: string;
  action: string;
  targetEntity: string;
  isOverride: boolean;
  timestamp: string; // ISO string e.g. "2026-08-27T00:35:00.000Z"
  ipAddress: string;
  device: string;
  details: string;
};

const STORAGE_KEY = 'technosys_admin_activities';

// Initial seed activities with real ISO timestamps relative to current date
export function getInitialSeedActivities(): AdminActivityItem[] {
  const now = Date.now();
  return [
    {
      id: 'LOG-1001',
      adminName: 'Nherie Anne Ferreras',
      adminRole: 'Accountant',
      adminRoleKey: 'accountant',
      moduleName: '201 Files',
      moduleKey: 'hr_files',
      department: 'HR Department',
      action: 'Removed Document Attachment',
      targetEntity: 'Medical_Certificate.pdf (Albert Flores)',
      isOverride: true,
      timestamp: new Date(now - 12 * 60 * 1000).toISOString(), // 12 mins ago
      ipAddress: '192.168.1.104',
      device: 'Chrome on Windows 11',
      details: 'User removed uploaded 201 document Medical Certificate for Albert Flores using CEO Granted System Override access.'
    },
    {
      id: 'LOG-1002',
      adminName: 'Andrew Adarayan',
      adminRole: 'Field Operations',
      adminRoleKey: 'coordinator',
      moduleName: 'Audit Logs',
      moduleKey: 'accountant_audit',
      department: 'Accountant',
      action: 'Exported Payroll Audit Data',
      targetEntity: 'Kinsenas_August_Payroll.xlsx',
      isOverride: true,
      timestamp: new Date(now - 35 * 60 * 1000).toISOString(), // 35 mins ago
      ipAddress: '192.168.1.112',
      device: 'Edge on Windows 11',
      details: 'Exported payroll audit calculation spreadsheet via CEO Granted Audit Logs override.'
    },
    {
      id: 'LOG-1003',
      adminName: 'Sasha P. Usa',
      adminRole: 'HR Department',
      adminRoleKey: 'hr',
      moduleName: 'Dispatch & Scheduling',
      moduleKey: 'coordinator_dispatch',
      department: 'Field Operations',
      action: 'Created Technician Dispatch',
      targetEntity: 'Ayala Center Makati (Juan Dela Cruz)',
      isOverride: true,
      timestamp: new Date(now - 75 * 60 * 1000).toISOString(), // 1h 15m ago
      ipAddress: '192.168.1.108',
      device: 'Safari on macOS',
      details: 'Created direct dispatch assignment for Juan Dela Cruz to Ayala Center Makati under CEO Dispatch Board override.'
    },
    {
      id: 'LOG-1004',
      adminName: 'Nherie Anne Ferreras',
      adminRole: 'Accountant',
      adminRoleKey: 'accountant',
      moduleName: 'Tickets & Leaves',
      moduleKey: 'hr_tickets',
      department: 'HR Department',
      action: 'Approved Sick Leave',
      targetEntity: 'Jemira Berdin (Fever - 3 Days)',
      isOverride: true,
      timestamp: new Date(now - 140 * 60 * 1000).toISOString(), // 2h 20m ago
      ipAddress: '192.168.1.104',
      device: 'Chrome on Windows 11',
      details: 'Approved 3-day sick leave request for Jemira Berdin using granted Tickets & Leaves permission override.'
    },
    {
      id: 'LOG-2001',
      adminName: 'Sasha P. Usa',
      adminRole: 'HR Department',
      adminRoleKey: 'hr',
      moduleName: 'Tickets & Leaves',
      moduleKey: 'hr_tickets',
      department: 'HR Department',
      action: 'Resolved Ticket Dispute',
      targetEntity: 'TICK-8841 (Overtime Calculation Error)',
      isOverride: false,
      timestamp: new Date(now - 18 * 60 * 1000).toISOString(), // 18 mins ago
      ipAddress: '192.168.1.108',
      device: 'Safari on macOS',
      details: 'HR admin marked ticket #8841 as resolved and updated status note.'
    },
    {
      id: 'LOG-2002',
      adminName: 'Nherie Anne Ferreras',
      adminRole: 'Accountant',
      adminRoleKey: 'accountant',
      moduleName: 'Audit Logs',
      moduleKey: 'accountant_audit',
      department: 'Accountant',
      action: 'Updated Kinsenas Overtime Hours',
      targetEntity: 'Technician Payroll (Albert Flores)',
      isOverride: false,
      timestamp: new Date(now - 50 * 60 * 1000).toISOString(), // 50 mins ago
      ipAddress: '192.168.1.104',
      device: 'Chrome on Windows 11',
      details: 'Accountant calculated and confirmed regular OT and night diff hours for Kinsenas period.'
    },
    {
      id: 'LOG-2003',
      adminName: 'Andrew Adarayan',
      adminRole: 'Field Operations',
      adminRoleKey: 'coordinator',
      moduleName: 'Dispatch & Scheduling',
      moduleKey: 'coordinator_dispatch',
      department: 'Field Operations',
      action: 'Updated Geofence Address',
      targetEntity: 'Glorietta 4, Makati City (100m radius)',
      isOverride: false,
      timestamp: new Date(now - 110 * 60 * 1000).toISOString(), // 1h 50m ago
      ipAddress: '192.168.1.112',
      device: 'Edge on Windows 11',
      details: 'Field Operations updated geofence center coordinates via Nominatim OpenStreetMap search.'
    },
    {
      id: 'LOG-2004',
      adminName: 'Sasha P. Usa',
      adminRole: 'HR Department',
      adminRoleKey: 'hr',
      moduleName: '201 Files',
      moduleKey: 'hr_files',
      department: 'HR Department',
      action: 'Issued Written Warning',
      targetEntity: 'Juan Dela Cruz (Unexcused Absence)',
      isOverride: false,
      timestamp: new Date(now - 210 * 60 * 1000).toISOString(), // 3h 30m ago
      ipAddress: '192.168.1.108',
      device: 'Safari on macOS',
      details: 'HR issued formal written warning for unexcused absence on Aug 20.'
    }
  ];
}

export function fetchAdminActivities(): AdminActivityItem[] {
  if (typeof window === 'undefined') return getInitialSeedActivities();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read admin activities from localStorage:', err);
  }

  const initial = getInitialSeedActivities();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

export function logAdminActivity(params: {
  adminName: string;
  adminRole: string;
  adminRoleKey: RoleKey | 'ceo';
  moduleKey: string;
  moduleName: string;
  department?: string;
  action: string;
  targetEntity: string;
  details?: string;
}): void {
  if (typeof window === 'undefined') return;

  const overrides = getSystemOverrides();
  
  // Determine if this action was performed using a CEO Override or within default job scope
  let isOverride = false;
  const modObj = SYSTEM_MODULES.find(m => m.id === params.moduleKey);
  const department = params.department || modObj?.department || 'System';

  if (params.adminRoleKey !== 'ceo' && modObj) {
    const isDefaultRole = modObj.defaultRoles.includes(params.adminRoleKey);
    if (!isDefaultRole) {
      // Check if CEO granted this override
      const grantedModules = overrides[params.adminRoleKey] || [];
      if (grantedModules.includes(params.moduleKey)) {
        isOverride = true;
      }
    }
  }

  const newLog: AdminActivityItem = {
    id: `LOG-${Date.now().toString().slice(-6)}`,
    adminName: params.adminName,
    adminRole: params.adminRole,
    adminRoleKey: params.adminRoleKey,
    moduleName: params.moduleName,
    moduleKey: params.moduleKey,
    department,
    action: params.action,
    targetEntity: params.targetEntity,
    isOverride,
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.104',
    device: navigator.userAgent.includes('Windows') ? 'Chrome on Windows 11' : 'Web Browser',
    details: params.details || `${params.adminName} (${params.adminRole}) executed "${params.action}" on ${params.targetEntity}.`
  };

  try {
    const currentLogs = fetchAdminActivities();
    const updated = [newLog, ...currentLogs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('admin_activities_updated'));
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

// Calculate dynamic relative time from ISO string
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 10) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}

export function formatExactDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
  } catch (e) {
    return isoString;
  }
}
