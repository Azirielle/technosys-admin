import { logActivity } from '@/app/actions/activity';

// Where an action happened, as shown in the CEO activity feed.
const CATEGORY_BY_MODULE: Record<string, string> = {
  hr_files: 'employee',
  hr_tickets: 'tickets',
  hr_dtr: 'audit',
  broadcaster: 'announcements',
  coordinator_dispatch: 'schedule',
  coordinator_inventory: 'inventory',
  coordinator_tracking: 'tracking',
};

/**
 * Records an admin action in the shared activity log (activity_logs table), so the CEO sees it.
 * The signed-in user is taken from the session on the server; the name/role here only build the description.
 */
export function logAdminActivity(params: {
  adminName: string;
  adminRole: string;
  adminRoleKey: string;
  moduleKey: string;
  moduleName: string;
  department?: string;
  action: string;
  targetEntity: string;
  details?: string;
}): void {
  const category = CATEGORY_BY_MODULE[params.moduleKey] || params.moduleKey;
  const description = params.details || `${params.action}: ${params.targetEntity}`;
  void logActivity({ category, action: params.action, description }).catch((err) =>
    console.error('Failed to record activity:', err)
  );
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
