// The pages and actions each office role can reach from Quick actions (Ctrl K) and by keyboard.
// "Go to" pages have a G + letter shortcut; "Do" actions start something new on a page (N on that page).
import type { LucideIcon } from 'lucide-react'
import {
  Box,
  Calendar,
  CalendarPlus,
  FilePlus2,
  FileSpreadsheet,
  FolderOpen,
  History,
  Home,
  KeyRound,
  MapPin,
  Megaphone,
  MessageSquare,
  PackagePlus,
  ScrollText,
} from 'lucide-react'
import type { PageCommand } from '@/components/commands/pageCommands'

export type AdminRole = 'ceo' | 'hr' | 'coordinator'

export interface QuickAction {
  id: string
  group: 'Go to' | 'Do'
  title: string
  hint: string
  icon: LucideIcon
  keywords: string[]
  path: string
  /** For "Do" actions: what the page should start. */
  command?: PageCommand
  /** Keys shown beside it, e.g. ['G', 'L']. */
  keys?: string[]
}

const page = (role: AdminRole, letter: string, slug: string, title: string, hint: string, icon: LucideIcon, keywords: string[]): QuickAction => ({
  id: `go-${slug || 'home'}`,
  group: 'Go to',
  title,
  hint,
  icon,
  keywords,
  path: slug ? `/${role}/${slug}` : `/${role}`,
  keys: ['G', letter],
})

const create = (role: AdminRole, slug: string, title: string, hint: string, icon: LucideIcon, keywords: string[]): QuickAction => ({
  id: `new-${slug}`,
  group: 'Do',
  title,
  hint,
  icon,
  keywords,
  path: `/${role}/${slug}`,
  command: 'new',
})

export const QUICK_ACTIONS: Record<AdminRole, QuickAction[]> = {
  ceo: [
    create('ceo', 'access', 'Give temporary access', 'Let HR or Service Dept use another page', KeyRound, ['access', 'permission', 'cover', 'temporary']),
    create('ceo', 'announcements', 'New announcement', 'Write news for field or office staff', Megaphone, ['announcement', 'notice', 'post', 'memo']),
    page('ceo', 'O', '', 'Company overview', 'Today at a glance', Home, ['overview', 'home', 'dashboard']),
    page('ceo', 'C', 'access', 'Temporary access', 'Who is covering which pages', KeyRound, ['access', 'cover', 'permission']),
    page('ceo', 'H', 'activities', 'Activity history', 'Who did what in the admin', History, ['history', 'log', 'audit', 'activity']),
    page('ceo', 'A', 'announcements', 'Announcements', 'Posted, scheduled and drafts', Megaphone, ['announcement', 'notice']),
    page('ceo', 'P', 'policies', 'Policies', 'Approve and publish what HR sent for review', ScrollText, ['policy', 'handbook', 'rules', 'approve']),
  ],
  hr: [
    create('hr', 'policies', 'New policy', 'Write a draft policy', FilePlus2, ['policy', 'draft', 'rules']),
    create('hr', 'announcements', 'New announcement', 'Write news for field or office staff', Megaphone, ['announcement', 'notice', 'post', 'memo']),
    page('hr', 'O', '', 'HR overview', 'Today at a glance', Home, ['overview', 'home', 'dashboard']),
    page('hr', 'L', 'leaves', 'Leave requests', 'Approve or decline leave', Calendar, ['leave', 'vacation', 'sick', 'time off']),
    page('hr', 'T', 'tickets', 'Tickets', 'Answer concerns from technicians', MessageSquare, ['tickets', 'concern', 'dispute', 'support']),
    page('hr', 'D', 'audit', 'DTR and attendance', 'Hours, lates, overtime; correct a punch', FileSpreadsheet, ['dtr', 'attendance', 'hours', 'late', 'overtime', 'cut-off']),
    page('hr', 'F', 'files', '201 files', 'Documents and warnings', FolderOpen, ['201', 'files', 'documents', 'warning', 'employee']),
    page('hr', 'P', 'policies', 'Policies', 'Write, approve and publish policies', ScrollText, ['policy', 'handbook', 'rules']),
    page('hr', 'A', 'announcements', 'Announcements', 'Posted, scheduled and drafts', Megaphone, ['announcement', 'notice']),
  ],
  coordinator: [
    create('coordinator', 'jobs', 'New job', 'Schedule a crew for a job', CalendarPlus, ['job', 'schedule', 'dispatch', 'crew', 'assign']),
    create('coordinator', 'inventory', 'Add a tool', 'Add a tool to the inventory', PackagePlus, ['tool', 'add', 'inventory', 'equipment']),
    create('coordinator', 'announcements', 'New announcement', 'Write news for field or office staff', Megaphone, ['announcement', 'notice', 'post', 'memo']),
    page('coordinator', 'O', '', 'Service overview', 'Today at a glance', Home, ['overview', 'home', 'dashboard']),
    page('coordinator', 'S', 'jobs', 'Scheduling', 'Assign crews to jobs', Calendar, ['schedule', 'dispatch', 'jobs', 'crew']),
    page('coordinator', 'M', 'tracking', 'Live map', 'Where the crews are now', MapPin, ['map', 'gps', 'tracking', 'location']),
    page('coordinator', 'I', 'inventory', 'Inventory', 'Lend and check in tools', Box, ['inventory', 'tools', 'stock', 'borrow']),
    page('coordinator', 'A', 'announcements', 'Announcements', 'Posted, scheduled and drafts', Megaphone, ['announcement', 'notice']),
  ],
}

/** G + letter → page, for the keyboard shortcuts. */
export function goToShortcuts(role: AdminRole): Record<string, string> {
  const map: Record<string, string> = {}
  for (const a of QUICK_ACTIONS[role]) if (a.group === 'Go to' && a.keys) map[a.keys[1].toLowerCase()] = a.path
  return map
}
