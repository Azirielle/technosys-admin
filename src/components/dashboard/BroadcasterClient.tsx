'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Megaphone,
  Plus,
  Search,
  Edit2,
  Trash2,
  Bell,
  Clock,
  Calendar,
  User,
  Users,
  ShieldAlert,
  AlertTriangle,
  Info,
  X,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  FileText,
  Send,
  Sparkles,
  Building2,
  Truck,
  Wrench,
  Calculator,
  UserCheck,
  Eye,
  Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAdminActivity, formatRelativeTime, formatExactDate } from '@/lib/auditLogger'
import { RoleKey } from '@/lib/overrides'

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------
export type AnnouncementImportance = 'normal' | 'important' | 'urgent'
export type AnnouncementStatus = 'published' | 'scheduled' | 'draft'

export type TargetAudienceKey = 'all' | 'field_technicians' | 'service_dept' | 'accounting' | 'hr'

export interface TargetAudienceOption {
  key: TargetAudienceKey
  label: string
  description: string
  icon: any
  recipientEstimate: number
}

export interface AnnouncementItem {
  id: string
  title: string
  content: string
  importance: AnnouncementImportance
  status: AnnouncementStatus
  target_audience: TargetAudienceKey
  target_audience_label: string
  created_by: string
  created_at: string
  scheduled_for?: string | null
  authorName: string
  authorRole: string
  is_edited?: boolean
  updated_at?: string
  last_edited_by?: string
  editorName?: string
  editorRole?: string
  send_push: boolean
}

// ---------------------------------------------------------------------------
// Role-based Audience Configuration
// ---------------------------------------------------------------------------
const AUDIENCE_OPTIONS: TargetAudienceOption[] = [
  {
    key: 'all',
    label: 'Everyone in TechnoCycle',
    description: 'All 48 employees across headquarters and branch operations',
    icon: Building2,
    recipientEstimate: 48
  },
  {
    key: 'field_technicians',
    label: 'Field Technicians & Drivers',
    description: '28 active mobile technicians and vehicle operators',
    icon: Truck,
    recipientEstimate: 28
  },
  {
    key: 'service_dept',
    label: 'Service Dept',
    description: '12 diagnostic engineers and dispatch coordinators',
    icon: Wrench,
    recipientEstimate: 12
  },
  {
    key: 'accounting',
    label: 'Accounting',
    description: '4 finance officers and payroll administrators',
    icon: Calculator,
    recipientEstimate: 4
  },
  {
    key: 'hr',
    label: 'Human Resources',
    description: '4 compliance officers and talent recruiters',
    icon: UserCheck,
    recipientEstimate: 4
  }
]

// ---------------------------------------------------------------------------
// Initial Seed Data (Authentic, Non-Technical Executive Content)
// ---------------------------------------------------------------------------
const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-101',
    title: 'Emergency Safety Protocol: Direct Dispatches in Subic & Cavite',
    content: 'Due to severe weather warnings in coastal sectors, all field technicians assigned to Subic and Cavite routes must confirm their safe arrival via the mobile check-in feature within 10 minutes of arrival at client premises.',
    importance: 'urgent',
    status: 'published',
    target_audience: 'field_technicians',
    target_audience_label: 'Field Technicians & Drivers',
    created_by: 'ceo-user-id',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    authorName: 'Carlos CEO',
    authorRole: 'Chief Executive Officer',
    is_edited: false,
    send_push: true
  },
  {
    id: 'ann-102',
    title: 'Annual Compliance Audit: Updated 201 Document Verification',
    content: 'The company-wide Q3 2026 personnel audit is currently underway. Please upload your updated NBI Clearances and Medical Certificates under your digital profile before the end of next week.',
    importance: 'important',
    status: 'published',
    target_audience: 'all',
    target_audience_label: 'Everyone in TechnoCycle',
    created_by: 'hr-user-id',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    authorName: 'Helena Vance',
    authorRole: 'Lead HR Officer',
    is_edited: true,
    updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    editorName: 'Carlos CEO',
    editorRole: 'Chief Executive Officer',
    send_push: true
  },
  {
    id: 'ann-103',
    title: 'Mid-Month Payroll Verification Cutoff for October',
    content: 'The Accounting department has finalized verified time logs and overtime calculations for the October 1-15 cycle. Digital payslips will be published to your mobile app by 5:00 PM tomorrow.',
    importance: 'normal',
    status: 'published',
    target_audience: 'accounting',
    target_audience_label: 'Accounting',
    created_by: 'acc-user-id',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    authorName: 'Elena Rostova',
    authorRole: 'Chief Accountant',
    is_edited: false,
    send_push: false
  },
  {
    id: 'ann-104',
    title: 'Upcoming Scheduled Power Maintenance at Main Facility',
    content: 'The local utility provider has scheduled power maintenance for this coming Saturday from 1:00 PM to 6:00 PM. Backup generators will maintain critical server infrastructure, but dispatch workstations should save open logs beforehand.',
    importance: 'important',
    status: 'scheduled',
    scheduled_for: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    target_audience: 'service_dept',
    target_audience_label: 'Service Dept',
    created_by: 'ceo-user-id',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    authorName: 'Carlos CEO',
    authorRole: 'Chief Executive Officer',
    is_edited: false,
    send_push: true
  },
  {
    id: 'ann-105',
    title: 'Draft: Fleet Winterization & Preventive Vehicle Checkups',
    content: 'Preliminary guidelines for mandatory quarterly vehicle inspection including brake pad calibration, tire depth verification, and emergency road kit checks.',
    importance: 'normal',
    status: 'draft',
    target_audience: 'field_technicians',
    target_audience_label: 'Field Technicians & Drivers',
    created_by: 'ceo-user-id',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    authorName: 'Carlos CEO',
    authorRole: 'Chief Executive Officer',
    is_edited: false,
    send_push: false
  }
]

interface BroadcasterClientProps {
  currentRole: RoleKey | 'ceo'
  adminName: string
  adminRoleLabel: string
}

export default function BroadcasterClient({ currentRole, adminName, adminRoleLabel }: BroadcasterClientProps) {
  // Navigation Modes: 'list' (Main Screen) or 'create' / 'edit' (Focused Creation Workflow)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list')
  const [createStep, setCreateStep] = useState<'form' | 'preview'>('form')

  // Announcements List State
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedImportanceFilter, setSelectedImportanceFilter] = useState<'all' | AnnouncementImportance>('all')

  // Detail Modal State
  const [viewingItem, setViewingItem] = useState<AnnouncementItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<AnnouncementItem | null>(null)

  // Creation / Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formAudience, setFormAudience] = useState<TargetAudienceKey>('all')
  const [formImportance, setFormImportance] = useState<AnnouncementImportance>('normal')
  const [formPublishTiming, setFormPublishTiming] = useState<'now' | 'schedule'>('now')
  const [formScheduleDate, setFormScheduleDate] = useState('')
  const [formSendPush, setFormSendPush] = useState(true)
  const [formErrors, setFormErrors] = useState<{ title?: string; content?: string; scheduleDate?: string }>({})

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  // ---------------------------------------------------------------------------
  // Load Announcements with Local Storage Fallback
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      // Check local storage first for session edits
      const cached = localStorage.getItem('technocycle_announcements_v2')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAnnouncements(parsed)
            setLoading(false)
            return
          }
        } catch (e) {}
      }

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
          importance: (item.priority || item.importance || 'normal') as AnnouncementImportance,
          status: (item.status || 'published') as AnnouncementStatus,
          target_audience: (item.target_audience || 'all') as TargetAudienceKey,
          target_audience_label: getAudienceLabel(item.target_audience || 'all'),
          created_by: item.created_by,
          created_at: item.created_at,
          scheduled_for: item.scheduled_for || null,
          authorName: item.author?.full_name || 'System Admin',
          authorRole: formatRoleBadge(item.author?.role || 'admin'),
          is_edited: item.is_edited || false,
          updated_at: item.updated_at,
          last_edited_by: item.last_edited_by,
          editorName: item.editor?.full_name || undefined,
          editorRole: item.editor?.role ? formatRoleBadge(item.editor.role) : undefined,
          send_push: item.send_push !== false
        }))
        setAnnouncements(formatted)
        localStorage.setItem('technocycle_announcements_v2', JSON.stringify(formatted))
      } else {
        setAnnouncements(INITIAL_ANNOUNCEMENTS)
        localStorage.setItem('technocycle_announcements_v2', JSON.stringify(INITIAL_ANNOUNCEMENTS))
      }
    } catch (err) {
      console.log('Using initial announcements fallback:', err)
      setAnnouncements(INITIAL_ANNOUNCEMENTS)
      localStorage.setItem('technocycle_announcements_v2', JSON.stringify(INITIAL_ANNOUNCEMENTS))
    } finally {
      setLoading(false)
    }
  }

  const saveAnnouncementsState = (updatedList: AnnouncementItem[]) => {
    setAnnouncements(updatedList)
    try {
      localStorage.setItem('technocycle_announcements_v2', JSON.stringify(updatedList))
    } catch (e) {}
  }

  const getAudienceLabel = (key: string): string => {
    const match = AUDIENCE_OPTIONS.find(o => o.key === key)
    return match ? match.label : 'Everyone in TechnoCycle'
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
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // ---------------------------------------------------------------------------
  // Navigation / Workflow Triggers
  // ---------------------------------------------------------------------------
  const handleStartCreate = () => {
    setEditingId(null)
    setFormTitle('')
    setFormContent('')
    setFormAudience('all')
    setFormImportance('normal')
    setFormPublishTiming('now')
    setFormScheduleDate('')
    setFormSendPush(true)
    setFormErrors({})
    setCreateStep('form')
    setViewMode('create')
  }

  // Handle Quick Action trigger (Custom Event or URL param)
  useEffect(() => {
    const handleQuickAction = () => handleStartCreate()
    window.addEventListener('open-create-announcement', handleQuickAction)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('action') === 'create') {
        setTimeout(() => handleStartCreate(), 150)
      }
    }

    return () => window.removeEventListener('open-create-announcement', handleQuickAction)
  }, [])

  const handleStartEdit = (item: AnnouncementItem) => {
    setEditingId(item.id)
    setFormTitle(item.title)
    setFormContent(item.content)
    setFormAudience(item.target_audience)
    setFormImportance(item.importance)
    setFormPublishTiming(item.status === 'scheduled' ? 'schedule' : 'now')
    setFormScheduleDate(item.scheduled_for ? new Date(item.scheduled_for).toISOString().slice(0, 16) : '')
    setFormSendPush(item.send_push)
    setFormErrors({})
    setCreateStep('form')
    setViewMode('edit')
  }

  const handleBackToList = () => {
    setViewMode('list')
    setCreateStep('form')
  }

  // ---------------------------------------------------------------------------
  // Step Progression: Validate & Proceed to Preview
  // ---------------------------------------------------------------------------
  const handleProceedToPreview = () => {
    const errors: { title?: string; content?: string; scheduleDate?: string } = {}
    if (!formTitle.trim()) {
      errors.title = 'Please provide an announcement title.'
    }
    if (!formContent.trim()) {
      errors.content = 'Please write the announcement message.'
    }
    if (formPublishTiming === 'schedule' && !formScheduleDate) {
      errors.scheduleDate = 'Please select a scheduled date and time.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setCreateStep('preview')
  }

  // ---------------------------------------------------------------------------
  // Final Save / Publish Action
  // ---------------------------------------------------------------------------
  const handleFinalPublish = async (asDraft: boolean = false) => {
    setIsSubmitting(true)
    const targetStatus: AnnouncementStatus = asDraft
      ? 'draft'
      : formPublishTiming === 'schedule'
        ? 'scheduled'
        : 'published'

    const audienceOption = AUDIENCE_OPTIONS.find(o => o.key === formAudience)
    const audienceLabel = audienceOption ? audienceOption.label : 'Everyone in TechnoCycle'

    if (viewMode === 'edit' && editingId) {
      // Update existing item
      const updatedList = announcements.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            title: formTitle.trim(),
            content: formContent.trim(),
            importance: formImportance,
            status: targetStatus,
            target_audience: formAudience,
            target_audience_label: audienceLabel,
            scheduled_for: targetStatus === 'scheduled' ? new Date(formScheduleDate).toISOString() : null,
            send_push: formSendPush,
            is_edited: true,
            updated_at: new Date().toISOString(),
            editorName: adminName,
            editorRole: adminRoleLabel
          }
        }
        return item
      })

      saveAnnouncementsState(updatedList)

      // Audit Log
      logAdminActivity({
        adminName,
        adminRole: adminRoleLabel,
        adminRoleKey: currentRole,
        moduleKey: 'broadcaster',
        moduleName: 'Announcements',
        action: 'Updated Announcement',
        targetEntity: `"${formTitle.trim()}" (${targetStatus.toUpperCase()})`
      })

      showToast(`Updated announcement: "${formTitle.trim()}"`)
    } else {
      // Create new item
      const newItem: AnnouncementItem = {
        id: `ann-${Date.now().toString().slice(-6)}`,
        title: formTitle.trim(),
        content: formContent.trim(),
        importance: formImportance,
        status: targetStatus,
        target_audience: formAudience,
        target_audience_label: audienceLabel,
        created_by: 'current-user-id',
        created_at: new Date().toISOString(),
        scheduled_for: targetStatus === 'scheduled' ? new Date(formScheduleDate).toISOString() : null,
        authorName: adminName,
        authorRole: adminRoleLabel,
        is_edited: false,
        send_push: formSendPush
      }

      saveAnnouncementsState([newItem, ...announcements])

      // Audit Log
      logAdminActivity({
        adminName,
        adminRole: adminRoleLabel,
        adminRoleKey: currentRole,
        moduleKey: 'broadcaster',
        moduleName: 'Announcements',
        action: asDraft ? 'Saved Draft Announcement' : 'Published Announcement',
        targetEntity: `"${formTitle.trim()}" (${targetStatus.toUpperCase()})`
      })

      showToast(
        asDraft
          ? `Draft saved: "${formTitle.trim()}"`
          : targetStatus === 'scheduled'
            ? `Announcement scheduled for ${new Date(formScheduleDate).toLocaleDateString()}`
            : `Announcement published to ${audienceLabel}!`
      )
    }

    setIsSubmitting(false)
    setViewMode('list')
    setCreateStep('form')
  }

  // ---------------------------------------------------------------------------
  // Delete Announcement Action
  // ---------------------------------------------------------------------------
  const confirmDelete = () => {
    if (!deletingItem) return
    const updatedList = announcements.filter(a => a.id !== deletingItem.id)
    saveAnnouncementsState(updatedList)

    logAdminActivity({
      adminName,
      adminRole: adminRoleLabel,
      adminRoleKey: currentRole,
      moduleKey: 'broadcaster',
      moduleName: 'Announcements',
      action: 'Removed Announcement',
      targetEntity: `"${deletingItem.title}"`
    })

    showToast(`Removed announcement: "${deletingItem.title}"`)
    setDeletingItem(null)
    if (viewingItem?.id === deletingItem.id) {
      setViewingItem(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Tab Counts & Filtered Records
  // ---------------------------------------------------------------------------
  const counts = useMemo(() => {
    return {
      all: announcements.length,
      published: announcements.filter(a => a.status === 'published').length,
      scheduled: announcements.filter(a => a.status === 'scheduled').length,
      draft: announcements.filter(a => a.status === 'draft').length
    }
  }, [announcements])

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(item => {
      // Tab filter
      if (activeTab !== 'all' && item.status !== activeTab) {
        return false
      }
      // Importance filter
      if (selectedImportanceFilter !== 'all' && item.importance !== selectedImportanceFilter) {
        return false
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesContent = item.content.toLowerCase().includes(q)
        const matchesAuthor = item.authorName.toLowerCase().includes(q)
        const matchesAudience = item.target_audience_label.toLowerCase().includes(q)
        if (!matchesTitle && !matchesContent && !matchesAuthor && !matchesAudience) {
          return false
        }
      }
      return true
    })
  }, [announcements, activeTab, selectedImportanceFilter, searchQuery])

  // ===========================================================================
  // RENDER: CREATE / EDIT WORKFLOW (Dedicated Focused Screen)
  // ===========================================================================
  if (viewMode === 'create' || viewMode === 'edit') {
    const selectedAudienceObj = AUDIENCE_OPTIONS.find(o => o.key === formAudience) || AUDIENCE_OPTIONS[0]

    return (
      <div className="flex flex-col h-full w-full max-w-full overflow-y-auto p-6 md:p-8 bg-[#F5F4F7] dark:bg-[#22232A] text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Navigation Breadcrumb / Header */}
        <div className="max-w-4xl mx-auto w-full mb-6">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-[#4D55CC] dark:hover:text-indigo-400 mb-3 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Announcements
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                {viewMode === 'edit' ? 'Edit Announcement' : 'Create Announcement'}
              </h1>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                {createStep === 'preview'
                  ? 'Review how your announcement will appear before broadcasting.'
                  : 'Draft a clear update with targeted audience and delivery settings.'}
              </p>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 bg-[#FAF9FB] dark:bg-[#2B2C35] px-3 py-1.5 rounded-xl border border-[#DDDCE2] dark:border-[#3E404D] text-xs font-bold shadow-xs">
              <span className={`px-2 py-0.5 rounded-md ${createStep === 'form' ? 'bg-[#4D55CC] text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                1. Compose
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              <span className={`px-2 py-0.5 rounded-md ${createStep === 'preview' ? 'bg-[#4D55CC] text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                2. Preview & Publish
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1: COMPOSE FORM */}
        {createStep === 'form' && (
          <div className="max-w-4xl mx-auto w-full space-y-6 pb-12">
            {/* Step 1: WHAT DO YOU WANT TO SAY? */}
            <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl p-6 border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBEAEF] dark:border-[#343640]">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                  1
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    What do you want to say?
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Write a concise headline and detailed message for your team.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Announcement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value)
                    if (formErrors.title) setFormErrors({ ...formErrors, title: undefined })
                  }}
                  placeholder="e.g. Schedule for Subic Facility Power Maintenance"
                  className="w-full px-4 py-2.5 bg-[#EBEAEF] dark:bg-[#343640] border border-[#DDDCE2] dark:border-[#3E404D] rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
                />
                {formErrors.title && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={formContent}
                  onChange={(e) => {
                    setFormContent(e.target.value)
                    if (formErrors.content) setFormErrors({ ...formErrors, content: undefined })
                  }}
                  placeholder="Write complete and actionable instructions. Mention key dates, affected branches, and required actions..."
                  className="w-full px-4 py-3 bg-[#EBEAEF] dark:bg-[#343640] border border-[#DDDCE2] dark:border-[#3E404D] rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#4D55CC] leading-relaxed"
                />
                {formErrors.content && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.content}
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: WHO SHOULD RECEIVE THIS? */}
            <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl p-6 border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBEAEF] dark:border-[#343640]">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                  2
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Who should receive this?
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Target the entire company, field personnel, or a specific department.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {AUDIENCE_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = formAudience === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFormAudience(opt.key)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-[#4D55CC] ring-1 ring-[#4D55CC]'
                          : 'bg-[#EBEAEF] dark:bg-[#343640] border-[#DDDCE2] dark:border-[#3E404D] hover:border-zinc-400 dark:hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#4D55CC] text-white' : 'bg-[#DDDCE2] dark:bg-[#2B2C35] text-zinc-600 dark:text-zinc-300'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#4D55CC] text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-black text-xs text-zinc-900 dark:text-zinc-100">{opt.label}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2 font-medium">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 3: HOW IMPORTANT IS THIS? */}
            <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl p-6 border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBEAEF] dark:border-[#343640]">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                  3
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    How important is this?
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Set the notification priority level for recipients.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Normal */}
                <button
                  type="button"
                  onClick={() => setFormImportance('normal')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    formImportance === 'normal'
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-[#EBEAEF] dark:bg-[#343640] border-[#DDDCE2] dark:border-[#3E404D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      <Info className="w-3 h-3" /> Normal
                    </span>
                    {formImportance === 'normal' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">General news & routine updates</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                    Delivered silently in app notifications feed without sound alerts.
                  </p>
                </button>

                {/* Important */}
                <button
                  type="button"
                  onClick={() => setFormImportance('important')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    formImportance === 'important'
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-[#4D55CC] ring-1 ring-[#4D55CC]'
                      : 'bg-[#EBEAEF] dark:bg-[#343640] border-[#DDDCE2] dark:border-[#3E404D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                      <Building2 className="w-3 h-3" /> Important
                    </span>
                    {formImportance === 'important' && <Check className="w-4 h-4 text-[#4D55CC] dark:text-indigo-400" />}
                  </div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">Pay attention notice</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                    Highlighted in employee portal and triggers standard push alert.
                  </p>
                </button>

                {/* Urgent */}
                <button
                  type="button"
                  onClick={() => setFormImportance('urgent')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    formImportance === 'urgent'
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-500 ring-1 ring-rose-500'
                      : 'bg-[#EBEAEF] dark:bg-[#343640] border-[#DDDCE2] dark:border-[#3E404D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                      <AlertTriangle className="w-3 h-3" /> Urgent
                    </span>
                    {formImportance === 'urgent' && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                  </div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">Time-sensitive alert</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                    Triggers high-priority mobile banner alert and prompt attention tag.
                  </p>
                </button>
              </div>
            </div>

            {/* Step 4: WHEN SHOULD IT BE SHARED? */}
            <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl p-6 border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBEAEF] dark:border-[#343640]">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                  4
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    When should it be shared?
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Broadcast immediately or choose a future date and time.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#EBEAEF] dark:bg-[#343640] border border-[#DDDCE2] dark:border-[#3E404D] cursor-pointer">
                  <input
                    type="radio"
                    name="publishTiming"
                    checked={formPublishTiming === 'now'}
                    onChange={() => setFormPublishTiming('now')}
                    className="w-4 h-4 text-[#4D55CC] focus:ring-[#4D55CC]"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Publish now</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                      Announcement appears on all recipient feeds immediately.
                    </div>
                  </div>
                </label>

                <label className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#EBEAEF] dark:bg-[#343640] border border-[#DDDCE2] dark:border-[#3E404D] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="publishTiming"
                      checked={formPublishTiming === 'schedule'}
                      onChange={() => setFormPublishTiming('schedule')}
                      className="w-4 h-4 text-[#4D55CC] focus:ring-[#4D55CC]"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Schedule for later</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        Specify the exact date and time this announcement becomes visible.
                      </div>
                    </div>
                  </div>

                  {formPublishTiming === 'schedule' && (
                    <div className="pt-2 pl-7">
                      <input
                        type="datetime-local"
                        value={formScheduleDate}
                        onChange={(e) => {
                          setFormScheduleDate(e.target.value)
                          if (formErrors.scheduleDate) setFormErrors({ ...formErrors, scheduleDate: undefined })
                        }}
                        className="px-3.5 py-2 bg-[#FAF9FB] dark:bg-[#2B2C35] border border-[#DDDCE2] dark:border-[#3E404D] rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
                      />
                      {formErrors.scheduleDate && (
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">
                          {formErrors.scheduleDate}
                        </p>
                      )}
                    </div>
                  )}
                </label>
              </div>

              {/* Mobile Push Alert Toggle */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#EBEAEF] dark:bg-[#343640] border border-[#DDDCE2] dark:border-[#3E404D] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-[#4D55CC] dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Send mobile push notification alert
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        Dispatches push notification directly to Technocycle mobile app users.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSendPush}
                    onChange={(e) => setFormSendPush(e.target.checked)}
                    className="w-4 h-4 text-[#4D55CC] rounded focus:ring-[#4D55CC]"
                  />
                </label>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleFinalPublish(true)}
                className="px-5 py-2.5 bg-[#FAF9FB] dark:bg-[#2B2C35] hover:bg-[#EBEAEF] dark:hover:bg-[#343640] text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs transition-colors cursor-pointer"
              >
                Save as Draft
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="px-5 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPreview}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4D55CC] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Preview Announcement
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & PUBLISH CONFIRMATION */}
        {createStep === 'preview' && (
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-12">
            <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl p-6 border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#EBEAEF] dark:border-[#343640] mb-5">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Employee View Preview
                  </span>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                    How this will appear on team feeds
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {formImportance === 'urgent' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                      <AlertTriangle className="w-3 h-3 text-rose-600" /> URGENT
                    </span>
                  )}
                  {formImportance === 'important' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                      <Building2 className="w-3 h-3 text-[#4D55CC]" /> IMPORTANT
                    </span>
                  )}
                  {formImportance === 'normal' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      <Info className="w-3 h-3 text-emerald-600" /> NORMAL
                    </span>
                  )}
                </div>
              </div>

              {/* Simulated Announcement Notice */}
              <div className="bg-[#EBEAEF] dark:bg-[#343640] rounded-xl p-5 border border-[#DDDCE2] dark:border-[#3E404D] space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#4D55CC] text-white flex items-center justify-center font-black text-xs">
                      {adminName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">{adminName}</span>
                        <span className="text-[10px] font-bold text-[#4D55CC] dark:text-indigo-300 bg-indigo-100/60 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                          {adminRoleLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {formPublishTiming === 'schedule' ? `Scheduled for ${new Date(formScheduleDate).toLocaleString()}` : 'Just now'}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-[#FAF9FB] dark:bg-[#2B2C35] px-2.5 py-1 rounded-md border border-[#DDDCE2] dark:border-[#3E404D]">
                    {selectedAudienceObj.label}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">
                    {formTitle}
                  </h4>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">
                    {formContent}
                  </p>
                </div>
              </div>

              {/* Delivery Summary Strip */}
              <div className="mt-5 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-[#4D55CC] dark:text-indigo-400" />
                  <span>
                    Will be delivered to approx. <strong>{selectedAudienceObj.recipientEstimate} recipients</strong> in{' '}
                    <strong>{selectedAudienceObj.label}</strong>
                  </span>
                </div>
                {formSendPush && (
                  <span className="text-[11px] font-bold text-[#4D55CC] dark:text-indigo-300 flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" /> Mobile push enabled
                  </span>
                )}
              </div>
            </div>

            {/* Confirmation Question & Actions */}
            <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl p-6 border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  Is everything correct?
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Confirm to publish to team noticeboards or return to make edits.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreateStep('form')}
                  className="px-5 py-2.5 bg-[#EBEAEF] dark:bg-[#343640] hover:bg-[#DDDCE2] dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinalPublish(false)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4D55CC] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting
                    ? 'Publishing...'
                    : formPublishTiming === 'schedule'
                      ? 'Schedule Announcement'
                      : 'Publish Announcement'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===========================================================================
  // RENDER: MAIN LIST VIEW
  // ===========================================================================
  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden p-6 md:p-8 bg-[#F5F4F7] dark:bg-[#22232A] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[120] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-zinc-700 animate-slide-in text-xs font-bold">
          <Sparkles className="w-4 h-4 text-[#4D55CC] dark:text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Announcements
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Share updates with the people who need to know.
          </p>
        </div>
      </div>

      {/* HERO CALLOUT BOX */}
      <div className="mb-6 p-6 rounded-2xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100/70 dark:bg-indigo-950/60 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              Have something to announce?
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
              Create a clear announcement for your team with audience targeting and mobile alerts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4D55CC] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create Announcement
        </button>
      </div>

      {/* SECTION: YOUR ANNOUNCEMENTS */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl border border-[#DDDCE2] dark:border-[#3E404D] shadow-xs overflow-hidden">
        {/* Controls Bar: Tabs & Search */}
        <div className="p-4 md:p-5 border-b border-[#EBEAEF] dark:border-[#343640] flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Segmented Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#EBEAEF] dark:bg-[#343640] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'published'
                  ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Published ({counts.published})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'scheduled'
                  ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Scheduled ({counts.scheduled})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'draft'
                  ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Drafts ({counts.draft})
            </button>
          </div>

          {/* Search Input & Importance Filter */}
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md ml-auto">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#EBEAEF] dark:bg-[#343640] border border-[#DDDCE2] dark:border-[#3E404D] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4D55CC] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>

            <select
              value={selectedImportanceFilter}
              onChange={(e) => setSelectedImportanceFilter(e.target.value as any)}
              className="bg-[#EBEAEF] dark:bg-[#343640] border border-[#DDDCE2] dark:border-[#3E404D] rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="important">Important</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>

        {/* Announcement Cards Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 [scrollbar-gutter:stable]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 rounded-xl bg-[#EBEAEF] dark:bg-[#343640] animate-pulse h-28" />
              ))}
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="p-12 text-center bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-xl">
              <Megaphone className="w-10 h-10 text-zinc-400 dark:text-zinc-500 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {activeTab === 'draft'
                  ? 'No drafts found'
                  : activeTab === 'scheduled'
                    ? 'No scheduled announcements'
                    : 'No announcements match your search'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                {activeTab === 'draft'
                  ? 'Drafts saved during creation will appear here.'
                  : 'Click "+ Create Announcement" above to publish a new update.'}
              </p>
            </div>
          ) : (
            filteredAnnouncements.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-[#DDDCE2] dark:border-[#3E404D] hover:border-[#4D55CC] dark:hover:border-indigo-400 transition-all flex flex-col justify-between group shadow-2xs"
              >
                {/* Top Metadata Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* Status Pill */}
                    {item.status === 'published' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                        Published
                      </span>
                    )}
                    {item.status === 'scheduled' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                        <Clock className="w-3 h-3" /> Scheduled
                      </span>
                    )}
                    {item.status === 'draft' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                        Draft
                      </span>
                    )}

                    {/* Importance Badge */}
                    {item.importance === 'urgent' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                      </span>
                    )}
                    {item.importance === 'important' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                        <Building2 className="w-3 h-3" /> Important
                      </span>
                    )}
                    {item.importance === 'normal' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Normal
                      </span>
                    )}

                    {/* Audience Tag */}
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-[#EBEAEF] dark:bg-[#343640] px-2.5 py-0.5 rounded-md border border-[#DDDCE2] dark:border-[#3E404D]">
                      {item.target_audience_label}
                    </span>
                  </div>

                  {/* Timing & Actions */}
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="text-[11px] font-medium">
                      {item.status === 'scheduled' && item.scheduled_for
                        ? `Scheduled for ${formatExactDate(item.scheduled_for)}`
                        : formatRelativeTime(item.created_at)}
                    </span>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 bg-[#EBEAEF] dark:bg-[#343640] rounded-lg p-0.5 border border-[#DDDCE2] dark:border-[#3E404D]">
                      <button
                        type="button"
                        onClick={() => setViewingItem(item)}
                        title="View Details"
                        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-[#4D55CC] dark:hover:text-indigo-400 hover:bg-[#FAF9FB] dark:hover:bg-[#2B2C35] rounded-md transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        title="Edit Announcement"
                        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-[#4D55CC] dark:hover:text-indigo-400 hover:bg-[#FAF9FB] dark:hover:bg-[#2B2C35] rounded-md transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        title="Remove Announcement"
                        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 hover:bg-[#FAF9FB] dark:hover:bg-[#2B2C35] rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Title & Body Excerpt */}
                <div className="cursor-pointer" onClick={() => setViewingItem(item)}>
                  <h3 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100 mb-1.5 group-hover:text-[#4D55CC] dark:group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed line-clamp-2">
                    {item.content}
                  </p>
                </div>

                {/* Footer Sub-bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-[#EBEAEF] dark:border-[#343640] text-[11px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span>
                      Posted by <strong className="font-extrabold text-zinc-700 dark:text-zinc-300">{item.authorName}</strong> ({item.authorRole})
                    </span>
                    {item.is_edited && (
                      <span>&bull; Edited {item.updated_at ? formatRelativeTime(item.updated_at) : ''}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingItem(item)}
                    className="text-[#4D55CC] dark:text-indigo-400 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    View Details &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =======================================================================
          DOCUMENT DETAILS MODAL (Activity Details Style)
      ======================================================================= */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-[#DDDCE2] dark:border-[#3E404D] animate-scale-in text-xs text-zinc-800 dark:text-zinc-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EBEAEF] dark:border-[#343640] flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Announcement Details
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      viewingItem.status === 'published'
                        ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : viewingItem.status === 'scheduled'
                          ? 'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}>
                      {viewingItem.status}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                    {viewingItem.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Body (Hairline Dividers, Clean Hierarchy) */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Full Content */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                  Message Content
                </span>
                <p className="text-xs md:text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap bg-[#EBEAEF] dark:bg-[#343640] p-4 rounded-xl border border-[#DDDCE2] dark:border-[#3E404D]">
                  {viewingItem.content}
                </p>
              </div>

              {/* People & Audience */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#EBEAEF] dark:border-[#343640]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                    Authorized By
                  </span>
                  <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                    {viewingItem.authorName}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    {viewingItem.authorRole}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                    Target Audience
                  </span>
                  <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                    {viewingItem.target_audience_label}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    Delivered to active portal accounts
                  </div>
                </div>
              </div>

              {/* Priority & Timing */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#EBEAEF] dark:border-[#343640]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                    Importance Level
                  </span>
                  <div className="font-extrabold text-xs capitalize text-zinc-900 dark:text-zinc-100">
                    {viewingItem.importance}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    {viewingItem.send_push ? 'Push alerts dispatched' : 'Silent portal bulletin'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                    {viewingItem.status === 'scheduled' ? 'Scheduled Broadcast' : 'Publication Timestamp'}
                  </span>
                  <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                    {viewingItem.status === 'scheduled' && viewingItem.scheduled_for
                      ? formatExactDate(viewingItem.scheduled_for)
                      : formatExactDate(viewingItem.created_at)}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    {formatRelativeTime(viewingItem.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#EBEAEF] dark:bg-[#343640] border-t border-[#DDDCE2] dark:border-[#3E404D] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingItem(viewingItem)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingItem
                    setViewingItem(null)
                    handleStartEdit(toEdit)
                  }}
                  className="px-4 py-2 bg-[#FAF9FB] dark:bg-[#2B2C35] hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl border border-[#DDDCE2] dark:border-[#3E404D] transition-colors cursor-pointer"
                >
                  Edit Announcement
                </button>
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 bg-[#4D55CC] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          DELETE CONFIRMATION MODAL
      ======================================================================= */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[130] flex items-center justify-center p-4">
          <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-[#DDDCE2] dark:border-[#3E404D] animate-scale-in p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100/70 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                Remove Announcement?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                Are you sure you want to remove <strong className="text-zinc-800 dark:text-zinc-200">&quot;{deletingItem.title}&quot;</strong>? This action will be recorded in the access history ledger.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 bg-[#EBEAEF] dark:bg-[#343640] hover:bg-[#DDDCE2] dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
