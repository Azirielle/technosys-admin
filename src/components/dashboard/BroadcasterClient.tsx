'use client'

import PageHeader from '@/components/ui/PageHeader'

import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Plus,
  Search,
  Edit2,
  Trash2,
  Bell,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  Info,
  X,
  CheckCircle2,
  Megaphone,
  Radio,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAdminActivity, formatRelativeTime, formatExactDate } from '@/lib/auditLogger'
import { RoleKey } from '@/lib/overrides'

export type AnnouncementItem = {
  id: string
  title: string
  content: string
  priority: 'urgent' | 'policy' | 'normal'
  created_by: string
  created_at: string
  authorName: string
  authorRole: string
  is_edited?: boolean
  updated_at?: string
  last_edited_by?: string
  editorName?: string
  editorRole?: string
}

const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-101',
    title: '🚨 Emergency Protocol Reminder: Subic & Cavite Direct Dispatches',
    content: 'All field operation technicians assigned to direct dispatches in Subic and Cavite must confirm their arrival via biometric scan within 10 minutes of arrival at client premises.',
    priority: 'urgent',
    created_by: 'ceo-user-id',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    authorName: 'Carlos CEO',
    authorRole: 'Chief Executive Officer',
    is_edited: false
  },
  {
    id: 'ann-102',
    title: '📋 Updated 201 Document Verification Checklist',
    content: 'HR compliance audit for Q3 2026 is currently underway. Please upload your updated NBI Clearances and Medical Certificates under your 201 profile before August 31, 2026.',
    priority: 'policy',
    created_by: 'hr-user-id',
    created_at: new Date(Date.now() - 3 * 360 * 60 * 1000).toISOString(),
    authorName: 'Sasha P. Usa',
    authorRole: 'HR Department',
    is_edited: true,
    updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    editorName: 'Carlos CEO',
    editorRole: 'Chief Executive Officer'
  },
  {
    id: 'ann-103',
    title: '💰 August 1-15 Kinsenas Payroll Verification Schedule',
    content: 'The Accountant team has finalized time logs and OT calculations for the August 1-15 period. Payslips will be published to your mobile app by 5:00 PM tomorrow.',
    priority: 'normal',
    created_by: 'acc-user-id',
    created_at: new Date(Date.now() - 8 * 360 * 60 * 1000).toISOString(),
    authorName: 'Nherie Anne Ferreras',
    authorRole: 'Accountant',
    is_edited: false
  }
]

interface BroadcasterClientProps {
  currentRole: RoleKey | 'ceo'
  adminName: string
  adminRoleLabel: string
}

export default function BroadcasterClient({ currentRole, adminName, adminRoleLabel }: BroadcasterClientProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<AnnouncementItem | null>(null)

  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formPriority, setFormPriority] = useState<'urgent' | 'policy' | 'normal'>('normal')
  const [resendPush, setResendPush] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:created_by (full_name, role),
          editor:last_edited_by (full_name, role)
        `)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        const formatted: AnnouncementItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          priority: item.priority || 'normal',
          created_by: item.created_by,
          created_at: item.created_at,
          authorName: item.author?.full_name || 'System Admin',
          authorRole: formatRoleBadge(item.author?.role || 'admin'),
          is_edited: item.is_edited || false,
          updated_at: item.updated_at,
          last_edited_by: item.last_edited_by,
          editorName: item.editor?.full_name || undefined,
          editorRole: item.editor?.role ? formatRoleBadge(item.editor.role) : undefined
        }))
        setAnnouncements(formatted)
      } else {
        // Fallback to rich initial announcements if database is empty or offline
        setAnnouncements(INITIAL_ANNOUNCEMENTS)
      }
    } catch (err) {
      console.log('Using initial announcements fallback:', err)
      setAnnouncements(INITIAL_ANNOUNCEMENTS)
    }
    setLoading(false)
  }

  const formatRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case 'ceo':
      case 'super_admin':
        return 'Chief Executive Officer'
      case 'hr':
        return 'HR Department'
      case 'coordinator':
        return 'Field Operations'
      case 'accountant':
        return 'Accountant'
      default:
        return roleStr.toUpperCase()
    }
  }

  const showToast = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormTitle('')
    setFormContent('')
    setFormPriority('normal')
    setResendPush(true)
    setIsCreateModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (item: AnnouncementItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormContent(item.content)
    setFormPriority(item.priority)
    setResendPush(false)
  }

  // Handle Save New Announcement
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formContent.trim()) return

    setIsSubmitting(true)

    const newAnnouncement: AnnouncementItem = {
      id: `ann-${Date.now().toString().slice(-6)}`,
      title: formTitle.trim(),
      content: formContent.trim(),
      priority: formPriority,
      created_by: 'current-user-id',
      created_at: new Date().toISOString(),
      authorName: adminName,
      authorRole: adminRoleLabel,
      is_edited: false
    }

    try {
      const { data } = await supabase.from('announcements').insert({
        title: formTitle.trim(),
        content: formContent.trim(),
        priority: formPriority,
        created_at: new Date().toISOString()
      }).select()

      if (data && data[0]) {
        newAnnouncement.id = data[0].id
      }
    } catch (err) {
      console.log('Saved to state:', err)
    }

    // Queue push notification
    if (resendPush) {
      try {
        await supabase.from('push_notifications_queue').insert({
          title: `📢 ${formTitle.trim()}`,
          body: formContent.trim().slice(0, 120),
          data: { type: 'announcement', id: newAnnouncement.id },
          status: 'pending',
          created_at: new Date().toISOString()
        })
      } catch (e) {}
    }

    // Log CEO audit activity
    logAdminActivity({
      adminName,
      adminRole: adminRoleLabel,
      adminRoleKey: currentRole,
      moduleKey: 'broadcaster',
      moduleName: 'Broadcaster',
      action: 'Broadcasted Announcement',
      targetEntity: `"${formTitle.trim()}" (${formPriority.toUpperCase()})`
    })

    setAnnouncements(prev => [newAnnouncement, ...prev])
    setIsCreateModalOpen(false)
    setIsSubmitting(false)
    showToast(`Broadcasted: "${formTitle.trim()}" to all field technicians!`)
  }

  // Handle Save Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || !formTitle.trim() || !formContent.trim()) return

    setIsSubmitting(true)
    const updatedTime = new Date().toISOString()

    const updatedItem: AnnouncementItem = {
      ...editingItem,
      title: formTitle.trim(),
      content: formContent.trim(),
      priority: formPriority,
      is_edited: true,
      updated_at: updatedTime,
      editorName: adminName,
      editorRole: adminRoleLabel
    }

    try {
      await supabase.from('announcements').update({
        title: formTitle.trim(),
        content: formContent.trim(),
        priority: formPriority,
        is_edited: true,
        updated_at: updatedTime
      }).eq('id', editingItem.id)
    } catch (err) {
      console.log('Updated state fallback:', err)
    }

    // Queue push notification if checked
    if (resendPush) {
      try {
        await supabase.from('push_notifications_queue').insert({
          title: `✏️ [Updated] ${formTitle.trim()}`,
          body: formContent.trim().slice(0, 120),
          data: { type: 'announcement_edit', id: editingItem.id },
          status: 'pending',
          created_at: new Date().toISOString()
        })
      } catch (e) {}
    }

    // Log CEO audit activity
    logAdminActivity({
      adminName,
      adminRole: adminRoleLabel,
      adminRoleKey: currentRole,
      moduleKey: 'broadcaster',
      moduleName: 'Broadcaster',
      action: 'Edited Announcement',
      targetEntity: `Updated "${formTitle.trim()}"`
    })

    setAnnouncements(prev => prev.map(a => a.id === editingItem.id ? updatedItem : a))
    setEditingItem(null)
    setIsSubmitting(false)
    showToast(`Updated announcement: "${formTitle.trim()}"`)
  }

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deletingItem) return

    try {
      await supabase.from('announcements').delete().eq('id', deletingItem.id)
    } catch (err) {
      console.log('Deleted from state fallback:', err)
    }

    // Log CEO audit activity
    logAdminActivity({
      adminName,
      adminRole: adminRoleLabel,
      adminRoleKey: currentRole,
      moduleKey: 'broadcaster',
      moduleName: 'Broadcaster',
      action: 'Deleted Announcement',
      targetEntity: `Removed "${deletingItem.title}"`
    })

    setAnnouncements(prev => prev.filter(a => a.id !== deletingItem.id))
    showToast(`Removed announcement: "${deletingItem.title}"`)
    setDeletingItem(null)
  }

  // Filtered List
  const filtered = announcements.filter(item => {
    if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchTitle = item.title.toLowerCase().includes(q)
      const matchContent = item.content.toLowerCase().includes(q)
      const matchAuthor = item.authorName.toLowerCase().includes(q)
      if (!matchTitle && !matchContent && !matchAuthor) return false
    }
    return true
  })

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden p-6 bg-zinc-50 dark:bg-zinc-950">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-[100] bg-blue-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-blue-700 flex items-center gap-3 animate-slide-in">
          <Sparkles className="w-5 h-5 text-blue-300 shrink-0" />
          <span className="text-xs font-bold">{notification}</span>
        </div>
      )}

      {/* Header Bar */}
      <PageHeader
        title="Announcement Broadcaster"
        subtitle="Broadcast, modify, or remove company-wide announcements. All posted announcements are synced live to technicians' mobile devices."
        icon={Radio}
        className="rounded-2xl mb-6 shadow-sm"
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Broadcast Announcement
          </button>
        }
      />

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3 mb-6 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, message, or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Filter Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🔴 Urgent Alerts</option>
            <option value="policy">🔵 Policy Notices</option>
            <option value="normal">🟢 General Notices</option>
          </select>
        </div>
      </div>

      {/* Announcement Cards List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 dark:text-zinc-500 font-medium text-xs">
            Loading company announcements...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Megaphone className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No announcements match your search.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Broadcast a new announcement using the top button.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative group"
            >
              {/* Top Meta Bar */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center text-sm border border-blue-200 dark:border-blue-800 shadow-xs">
                    {item.authorName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{item.authorName}</span>
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                        {item.authorRole}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                        {formatRelativeTime(item.created_at)}
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono">{formatExactDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Priority Badge & Actions */}
                <div className="flex items-center gap-3">
                  {item.priority === 'urgent' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> URGENT ALERT
                    </span>
                  )}
                  {item.priority === 'policy' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> POLICY NOTICE
                    </span>
                  )}
                  {item.priority === 'normal' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <Info className="w-3.5 h-3.5 text-emerald-600" /> GENERAL
                    </span>
                  )}

                  {/* Admin Edit & Delete Actions */}
                  <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Announcement"
                      className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      title="Remove Announcement"
                      className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Title & Body */}
              <div className="mb-3">
                <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-1.5 tracking-tight">{item.title}</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">{item.content}</p>
              </div>

              {/* Edit History Badge */}
              {item.is_edited && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] font-medium text-purple-700 dark:text-purple-300">
                  <Edit2 className="w-3 h-3 text-purple-500" />
                  <span>
                    Edited by <strong className="font-extrabold">{item.editorName || 'Admin'}</strong> ({item.editorRole || 'Administrator'}) &bull; {item.updated_at ? formatRelativeTime(item.updated_at) : 'Recently'}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <div className="p-5 bg-zinc-900 dark:bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
                <h3 className="font-black text-base">New Broadcast Announcement</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 dark:text-zinc-500 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs text-zinc-700 dark:text-zinc-300">
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mandatory Safety Verification Protocol"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase mb-1">Priority / Tag</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">🟢 General Notice</option>
                  <option value="policy">🔵 Company Policy Notice</option>
                  <option value="urgent">🔴 Urgent Field Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase mb-1">Announcement Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write clear instructions for field technicians and admin staff..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-blue-900 text-xs">Send Push Notification to Mobile App</span>
                </div>
                <input
                  type="checkbox"
                  checked={resendPush}
                  onChange={(e) => setResendPush(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Broadcasting...' : 'Broadcast Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ANNOUNCEMENT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <div className="p-5 bg-zinc-900 dark:bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-base">Edit Announcement</h3>
              </div>
              <button onClick={() => setEditingItem(null)} className="text-zinc-400 dark:text-zinc-500 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs text-zinc-700 dark:text-zinc-300">
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase mb-1">Priority / Tag</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">🟢 General Notice</option>
                  <option value="policy">🔵 Company Policy Notice</option>
                  <option value="urgent">🔴 Urgent Field Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase mb-1">Announcement Content</label>
                <textarea
                  required
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-purple-900 text-xs">Resend Updated Mobile Push Alert</span>
                </div>
                <input
                  type="checkbox"
                  checked={resendPush}
                  onChange={(e) => setResendPush(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving Edit...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-base">Remove Announcement?</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium leading-relaxed">
                  Are you sure you want to delete <strong className="text-zinc-900 dark:text-zinc-100">&quot;{deletingItem.title}&quot;</strong>? This action will be recorded in CEO Audit Logs.
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 shadow-sm transition-colors"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
