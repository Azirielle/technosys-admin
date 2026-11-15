// The quick actions each office role sees in the Ctrl K palette: where each one goes, and words to find it by.
import type { LucideIcon } from 'lucide-react'
import { Box, Calendar, FileSpreadsheet, FolderOpen, History, Home, KeyRound, MapPin, Megaphone, MessageSquare, ScrollText } from 'lucide-react'

export type AdminRole = 'ceo' | 'hr' | 'coordinator'

export interface QuickAction {
  id: string
  title: string
  hint: string
  icon: LucideIcon
  keywords: string[]
  href: string
  /** If you're already on `href`, fire this window event instead (opens the form on that page). */
  event?: string
}

const ANNOUNCE = (role: AdminRole): QuickAction => ({
  id: 'announce',
  title: 'New announcement',
  hint: 'Write news for field or office staff',
  icon: Megaphone,
  keywords: ['announcement', 'notice', 'post', 'memo', 'broadcast'],
  href: `/${role}/announcements?action=create`,
  event: 'open-create-announcement',
})

export const QUICK_ACTIONS: Record<AdminRole, QuickAction[]> = {
  ceo: [
    { id: 'give-access', title: 'Give temporary access', hint: 'Let HR or Service Dept use the other pages', icon: KeyRound, keywords: ['access', 'permission', 'cover', 'temporary'], href: '/ceo/access?action=give_access', event: 'open-give-access-modal' },
    { id: 'activity', title: 'Activity history', hint: 'Who did what in the admin', icon: History, keywords: ['history', 'log', 'audit', 'activity'], href: '/ceo/activities' },
    { id: 'policies', title: 'Policies', hint: 'Approve and publish policies HR sent for review', icon: ScrollText, keywords: ['policy', 'handbook', 'rules', 'approve'], href: '/ceo/policies' },
    ANNOUNCE('ceo'),
    { id: 'overview', title: 'Company overview', hint: 'Today at a glance', icon: Home, keywords: ['overview', 'home', 'dashboard'], href: '/ceo' },
  ],
  hr: [
    { id: 'leaves', title: 'Leave requests', hint: 'Approve or decline leave', icon: Calendar, keywords: ['leave', 'vacation', 'sick', 'time off'], href: '/hr/leaves' },
    { id: 'tickets', title: 'Tickets', hint: 'Answer concerns from technicians', icon: MessageSquare, keywords: ['tickets', 'concern', 'dispute', 'support'], href: '/hr/tickets' },
    { id: 'dtr', title: 'DTR and attendance', hint: 'Hours, lates, overtime; correct a punch', icon: FileSpreadsheet, keywords: ['dtr', 'attendance', 'hours', 'late', 'overtime', 'cut-off'], href: '/hr/audit' },
    { id: 'files', title: '201 files', hint: 'Documents and warnings', icon: FolderOpen, keywords: ['201', 'files', 'documents', 'warning', 'employee'], href: '/hr/files' },
    { id: 'policies', title: 'Policies', hint: 'Write, approve and publish policies', icon: ScrollText, keywords: ['policy', 'handbook', 'rules'], href: '/hr/policies' },
    ANNOUNCE('hr'),
    { id: 'overview', title: 'HR overview', hint: 'Today at a glance', icon: Home, keywords: ['overview', 'home', 'dashboard'], href: '/hr' },
  ],
  coordinator: [
    { id: 'schedule', title: 'Scheduling', hint: 'Assign crews to jobs', icon: Calendar, keywords: ['schedule', 'dispatch', 'jobs', 'crew'], href: '/coordinator/dispatch' },
    { id: 'map', title: 'Live map', hint: 'Where the crews are now', icon: MapPin, keywords: ['map', 'gps', 'tracking', 'location'], href: '/coordinator/tracking' },
    { id: 'inventory', title: 'Inventory', hint: 'Lend and check in tools', icon: Box, keywords: ['inventory', 'tools', 'stock', 'borrow'], href: '/coordinator/inventory' },
    ANNOUNCE('coordinator'),
    { id: 'overview', title: 'Service overview', hint: 'Today at a glance', icon: Home, keywords: ['overview', 'home', 'dashboard'], href: '/coordinator' },
  ],
}
