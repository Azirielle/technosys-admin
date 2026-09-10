export type RoleKey = 'accountant' | 'coordinator' | 'hr';

export type SystemModule = {
  id: string;
  name: string;
  department: string;
  description: string;
  href: string;
  iconName: 'Ticket' | 'FolderOpen' | 'FileSpreadsheet' | 'MapPin' | 'Calendar' | 'Box';
  defaultRoles: RoleKey[];
};

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: 'hr_tickets',
    name: 'Tickets & Leaves',
    department: 'HR Department',
    description: 'Manage employee disputes, ticket resolutions, and leave approvals.',
    href: '/hr',
    iconName: 'Ticket',
    defaultRoles: ['hr'],
  },
  {
    id: 'hr_files',
    name: '201 Files',
    department: 'HR Department',
    description: '201 employee digital records, compliance checks, and disciplinary warnings.',
    href: '/hr/files',
    iconName: 'FolderOpen',
    defaultRoles: ['hr'],
  },
  {
    id: 'accountant_audit',
    name: 'Audit Logs',
    department: 'Accountant',
    description: 'Payroll audit logs, salary calculations, OT, and Excel/CSV exports.',
    href: '/accountant',
    iconName: 'FileSpreadsheet',
    defaultRoles: ['accountant'],
  },
  {
    id: 'coordinator_dispatch',
    name: 'Dispatch & Scheduling',
    department: 'Field Operations',
    description: 'Create dispatches, geocode addresses, and assign technician teams.',
    href: '/coordinator',
    iconName: 'Calendar',
    defaultRoles: ['coordinator'],
  },
  {
    id: 'coordinator_tracking',
    name: 'Live Tracking',
    department: 'Field Operations',
    description: 'Real-time GPS fleet tracking, technician map spotlighting, and field status.',
    href: '/coordinator/tracking',
    iconName: 'MapPin',
    defaultRoles: ['coordinator'],
  },
  {
    id: 'coordinator_inventory',
    name: 'Inventory Management',
    department: 'Field Operations',
    description: 'Parts inventory, tool issue logs, and equipment tracking.',
    href: '/coordinator/inventory',
    iconName: 'Box',
    defaultRoles: ['coordinator'],
  },
];

// Map of roleKey -> array of module IDs explicitly granted by CEO overrides
export type OverrideMap = Record<RoleKey, string[]>;

const STORAGE_KEY = 'technosys_system_overrides';

export function getSystemOverrides(): OverrideMap {
  if (typeof window === 'undefined') {
    return { accountant: [], coordinator: [], hr: [] };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse system overrides:', e);
  }

  return { accountant: [], coordinator: [], hr: [] };
}

export function saveSystemOverrides(overrides: OverrideMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    // Dispatch custom event so sidebar updates instantly across tabs
    window.dispatchEvent(new Event('system_overrides_updated'));
  } catch (e) {
    console.error('Failed to save system overrides:', e);
  }
}

/**
 * Fetches overrides directly from Supabase and syncs local cache.
 */
export async function fetchRemoteOverrides(): Promise<OverrideMap> {
  if (typeof window === 'undefined') {
    return { accountant: [], coordinator: [], hr: [] };
  }

  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data, error } = await supabase
      .from('system_overrides')
      .select('role_key, granted_modules');

    if (!error && data) {
      const map: OverrideMap = { accountant: [], coordinator: [], hr: [] };
      data.forEach((row: { role_key: string; granted_modules: string[] }) => {
        if (row.role_key === 'accountant' || row.role_key === 'coordinator' || row.role_key === 'hr') {
          map[row.role_key] = Array.isArray(row.granted_modules) ? row.granted_modules : [];
        }
      });
      saveSystemOverrides(map);
      return map;
    }
  } catch (err) {
    console.warn('Failed to fetch remote system overrides, using local fallback:', err);
  }

  return getSystemOverrides();
}

/**
 * Subscribes to Supabase Realtime changes on `system_overrides`.
 * Invokes callback and fires 'system_overrides_updated' event when changes occur.
 */
export function subscribeToOverrideChanges(onUpdate?: (overrides: OverrideMap) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  try {
    let channel: any = null;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      channel = supabase
        .channel('realtime-system-overrides')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_overrides' },
          async () => {
            const fresh = await fetchRemoteOverrides();
            if (onUpdate) onUpdate(fresh);
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        import('@/lib/supabase/client').then(({ createClient }) => {
          const supabase = createClient();
          supabase.removeChannel(channel);
        });
      }
    };
  } catch (err) {
    console.warn('Failed to subscribe to system overrides realtime:', err);
    return () => {};
  }
}

export function getModuleHref(modId: string, role: RoleKey): string {
  switch (modId) {
    case 'hr_files':
      return role === 'hr' ? '/hr/files' : `/${role}/files`;
    case 'hr_tickets':
      return role === 'hr' ? '/hr' : `/${role}/tickets`;
    case 'accountant_audit':
      return role === 'accountant' ? '/accountant' : `/${role}/audit`;
    case 'coordinator_tracking':
      return role === 'coordinator' ? '/coordinator/tracking' : `/${role}/tracking`;
    case 'coordinator_dispatch':
      return role === 'coordinator' ? '/coordinator' : `/${role}/dispatch`;
    case 'coordinator_inventory':
      return role === 'coordinator' ? '/coordinator/inventory' : `/${role}/inventory`;
    default:
      return '/';
  }
}
