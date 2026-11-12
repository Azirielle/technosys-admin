'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  ScrollText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ExternalLink,
  Users,
  Clock,
  Plus,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  Library,
  ShieldAlert,
  GitBranch,
  Send,
  X,
  FileText,
  AlertTriangle,
  History,
  Check,
  ChevronRight,
  Archive,
  CheckCheck,
  Loader2,
  FileCheck,
  HelpCircle,
  Info,
} from 'lucide-react'
import ModalDialog from '@/components/ui/ModalDialog'
import FormattedPolicyDocument from '@/components/policies/FormattedPolicyDocument'
import {
  CompanyPolicy,
  PolicyAcknowledgmentItem,
  PolicyComplianceSummary,
  PolicyCategory,
  PolicyLifecycleStatus,
  getAllPolicies,
  getPolicyAcknowledgments,
  getPolicyComplianceMetrics,
  createPolicyDraft,
  forkPolicyRevision,
  updatePolicyDraft,
  submitPolicyForReview,
  requestPolicyChanges,
  publishPolicy,
  archivePolicy,
  dispatchPolicyReminder,
} from '@/app/actions/policies'

export default function PolicyHubClient() {
  const [policies, setPolicies] = useState<CompanyPolicy[]>([])
  const [acknowledgments, setAcknowledgments] = useState<PolicyAcknowledgmentItem[]>([])
  const [complianceStats, setComplianceStats] = useState<PolicyComplianceSummary>({
    totalPolicies: 8,
    activePolicies: 6,
    underReviewPolicies: 1,
    draftPolicies: 1,
    archivedPolicies: 0,
    mandatoryPolicies: 5,
    totalWorkforce: 35,
    totalCompanyStaff: 45,
    fieldWorkforceCount: 35,
    adminStaffCount: 10,
    fullyCompliantCount: 4,
    compliancePercentage: 11,
    pendingSignaturesCount: 31,
  })
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Primary View Controller: 'workspace' (triage hub) vs 'library' (document vault)
  const [currentView, setCurrentView] = useState<'workspace' | 'library'>('workspace')
  const [libraryTab, setLibraryTab] = useState<'all' | 'published' | 'drafts_review' | 'archived'>('all')
  const [workspaceFilter, setWorkspaceFilter] = useState<'all' | 'urgent' | 'drafts'>('all')

  // Selected Policy for Slide-Over Inspector Drawer
  const [selectedPolicy, setSelectedPolicy] = useState<CompanyPolicy | null>(null)
  const [inspectorTab, setInspectorTab] = useState<'document' | 'compliance' | 'history'>('document')

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'active' | 'under_review' | 'draft' | 'archived'>('all')

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)
  const [createPreviewMode, setCreatePreviewMode] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [showEditDraftModal, setShowEditDraftModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showHandbookModal, setShowHandbookModal] = useState(false)

  // Draft Form State
  const [draftForm, setDraftForm] = useState({
    title: '',
    category: 'hr_attendance' as PolicyCategory,
    version: 'v1.0.0-draft',
    target_audience: 'all' as 'all' | 'technician' | 'admin',
    effective_date: '',
    summary: '',
    content_markdown: '',
    is_mandatory: true,
  })

  // Publish Form State
  const [publishForm, setPublishForm] = useState({
    isMaterialChange: false,
    effectiveDate: '',
    emergencyImmediate: false,
  })

  // Change Request Notes State
  const [reviewNotesInput, setReviewNotesInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [polRes, ackRes, statRes] = await Promise.all([
        getAllPolicies(),
        getPolicyAcknowledgments(),
        getPolicyComplianceMetrics(),
      ])

      if (polRes.success) setPolicies(polRes.policies)
      if (ackRes.success) setAcknowledgments(ackRes.acknowledgments)
      setComplianceStats(statRes)

      // Refresh currently selected policy if open
      if (selectedPolicy && polRes.success) {
        const fresh = polRes.policies.find((p) => p.id === selectedPolicy.id)
        if (fresh) setSelectedPolicy(fresh)
      }
    } catch (err: any) {
      console.error('Failed to load policy hub data:', err)
      showToast(err.message || 'Failed to load policy data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Sync URL search params with currentView (?view=library or ?view=workspace)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const v = params.get('view')
      if (v === 'library' || v === 'workspace') {
        setCurrentView(v)
      }
    }
  }, [])

  const switchView = (newView: 'workspace' | 'library') => {
    setCurrentView(newView)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('view', newView)
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Format date helper for scannable library table (e.g. "Oct 12, 2026")
  const formatLastUpdated = (policy: CompanyPolicy) => {
    const raw = policy.updated_at || policy.published_at || policy.created_at || policy.effective_date
    if (!raw) return 'Recently'
    try {
      const d = new Date(raw)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return 'Recently'
    }
  }

  // Keyboard navigation: Escape key closes the slide-over inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPolicy) {
        setSelectedPolicy(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPolicy])

  // Category mapping
  const CATEGORIES: { id: string; label: string; count: number }[] = useMemo(() => {
    const counts: Record<string, number> = {}
    policies.forEach((p) => {
      const cat = p.category
      counts[cat] = (counts[cat] || 0) + 1
    })
    return [
      { id: 'all', label: 'All Categories', count: policies.length },
      { id: 'hr_attendance', label: 'HR & Employment', count: (counts['hr_attendance'] || 0) + (counts['employment'] || 0) },
      { id: 'field_ops', label: 'Field Safety & OSH', count: (counts['field_ops'] || 0) + (counts['safety'] || 0) },
      { id: 'inventory', label: 'Tool Custody & Assets', count: counts['inventory'] || 0 },
      { id: 'conduct', label: 'Code of Conduct', count: counts['conduct'] || 0 },
      { id: 'legal', label: 'Legal & Privacy', count: counts['legal'] || 0 },
      { id: 'executive', label: 'Executive Governance', count: counts['executive'] || 0 },
    ]
  }, [policies])

  // Calculation for Workforce Signatures per Policy with Dynamic Audience Cardinality
  const policySignaturesMap = useMemo(() => {
    const map: Record<
      string,
      {
        signedCount: number
        eligibleCount: number
        audienceLabel: string
        signedPercent: number
        signedUsers: PolicyAcknowledgmentItem[]
      }
    > = {}

    const totalStaff = complianceStats.totalCompanyStaff || 45
    const fieldStaff = complianceStats.fieldWorkforceCount || 35
    const adminStaff = complianceStats.adminStaffCount || 10

    policies.forEach((p) => {
      const matchingAcks = acknowledgments.filter(
        (ack) => ack.policy_id === p.id && ack.policy_version === p.version
      )
      const signedCount = matchingAcks.length

      // Dynamic audience denominator
      let eligibleCount = totalStaff
      let audienceLabel = 'company personnel'
      if (p.target_audience === 'technician') {
        eligibleCount = fieldStaff
        audienceLabel = 'field personnel'
      } else if (p.target_audience === 'admin') {
        eligibleCount = adminStaff
        audienceLabel = 'administrative staff'
      }

      const signedPercent = Math.min(100, Math.round((signedCount / eligibleCount) * 100))
      map[p.id] = {
        signedCount,
        eligibleCount,
        audienceLabel,
        signedPercent,
        signedUsers: matchingAcks,
      }
    })

    return map
  }, [
    policies,
    acknowledgments,
    complianceStats.totalCompanyStaff,
    complianceStats.fieldWorkforceCount,
    complianceStats.adminStaffCount,
  ])

  // Actionable Attention Items:
  // 1. Policies awaiting approval ('under_review') - Priority 1
  // 2. Active mandatory policies with low compliance (< 50% signed) - Priority 2
  // 3. Drafts in progress ('draft') - Priority 3
  const allAttentionItems = useMemo(() => {
    const items = policies.filter((p) => {
      if (p.status === 'under_review') return true
      if (p.status === 'draft') return true
      if (p.status === 'active' && p.is_mandatory) {
        const stats = policySignaturesMap[p.id]
        if (stats && stats.signedPercent < 50 && stats.eligibleCount > 0) {
          return true
        }
      }
      return false
    })

    // Strict Urgency Priority:
    // Urgent approvals (under_review) -> Overdue employee compliance (active) -> Saved drafts (draft)
    return items.sort((a, b) => {
      const priority = (p: CompanyPolicy) => {
        if (p.status === 'under_review') return 1
        if (p.status === 'active') return 2
        if (p.status === 'draft') return 3
        return 4
      }
      const pDiff = priority(a) - priority(b)
      if (pDiff !== 0) return pDiff
      // Secondary sort: nearest effective date
      return (a.effective_date || '').localeCompare(b.effective_date || '')
    })
  }, [policies, policySignaturesMap])

  // Contextually filtered items based on user's workspace triage tab
  const attentionItems = useMemo(() => {
    if (workspaceFilter === 'urgent') {
      return allAttentionItems.filter((p) => p.status === 'under_review' || p.status === 'active')
    }
    if (workspaceFilter === 'drafts') {
      return allAttentionItems.filter((p) => p.status === 'draft')
    }
    return allAttentionItems
  }, [allAttentionItems, workspaceFilter])

  // Filtered Policies for Minimalist Library (All policies | Published | Drafts & review | Archived)
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      // 1. Search filter
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)

      // 2. Tab filter
      let matchStatus = true
      if (libraryTab === 'published') {
        matchStatus = p.status === 'active'
      } else if (libraryTab === 'drafts_review') {
        matchStatus = p.status === 'draft' || p.status === 'under_review'
      } else if (libraryTab === 'archived') {
        matchStatus = p.status === 'archived'
      }

      return matchSearch && matchStatus
    })
  }, [policies, searchQuery, libraryTab])

  // Handlers for Policy Lifecycle Actions
  const handleOpenCreateDraft = () => {
    const defaultEffective = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    setDraftForm({
      title: '',
      category: 'hr_attendance',
      version: 'v1.0.0-draft',
      target_audience: 'all',
      effective_date: defaultEffective,
      summary: '',
      content_markdown: '# NEW POLICY TITLE\n\n### 1. Corporate Scope\nDetail the objective and applicability of this policy...',
      is_mandatory: true,
    })
    setCreateStep(1)
    setCreatePreviewMode(false)
    setTitleError(null)
    setShowCreateModal(true)
  }

  // Simplified initial draft creation: Only title is strictly mandatory!
  const handleSaveNewDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftForm.title.trim()) {
      setTitleError('Policy title is required.')
      setCreateStep(1)
      setTimeout(() => titleInputRef.current?.focus(), 50)
      return
    }
    setTitleError(null)

    setActionLoading(true)
    try {
      const res = await createPolicyDraft({
        ...draftForm,
        summary: draftForm.summary.trim() || 'Working draft in development.',
        content_markdown: draftForm.content_markdown.trim() || `# ${draftForm.title}\n\nDraft content pending completion.`,
      })
      if (res.success && res.policy) {
        showToast(`Working draft "${res.policy.title}" saved.`, 'success')
        setShowCreateModal(false)
        await loadData()
        setSelectedPolicy(res.policy)
      } else {
        showToast(res.error || 'Failed to create draft', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating policy draft', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleForkRevision = async (policy: CompanyPolicy) => {
    setActionLoading(true)
    try {
      const res = await forkPolicyRevision(policy.id)
      if (res.success && res.policy) {
        if (res.isExisting) {
          showToast(`Opened existing draft revision (${res.policy.version})`, 'success')
        } else {
          showToast(`Forked new working draft revision (${res.policy.version})`, 'success')
        }
        await loadData()
        setSelectedPolicy(res.policy)
        setInspectorTab('document')
      } else {
        showToast(res.error || 'Failed to fork revision', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error forking revision', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitForReview = async (policy: CompanyPolicy) => {
    // Validate required governance fields upon submission
    if (!policy.summary?.trim() || !policy.content_markdown?.trim()) {
      showToast('Please complete executive summary and policy content before submitting for review', 'error')
      return
    }

    const isCoordinatorReview =
      policy.review_notes?.toLowerCase().includes('coordinator') ||
      ['safety', 'field_ops', 'inventory'].includes(policy.category)
    const reviewNote = isCoordinatorReview
      ? 'Under review by Field Operations Coordinator. Awaiting operational sign-off before formal HR publication.'
      : 'Under review by Lead HR Officer & Executive. Awaiting formal review sign-off.'

    setActionLoading(true)
    try {
      const res = await submitPolicyForReview(policy.id, reviewNote)
      if (res.success && res.policy) {
        showToast(
          isCoordinatorReview
            ? `Review requested from Field Operations Coordinator for "${res.policy.title}".`
            : `Policy "${res.policy.title}" submitted for formal review.`,
          'success'
        )
        await loadData()
        setSelectedPolicy(res.policy)
      } else {
        showToast(res.error || 'Failed to submit policy for review', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error submitting for review', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenPublishModal = (policy: CompanyPolicy) => {
    const defaultEffective = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
    setPublishForm({
      isMaterialChange: false,
      effectiveDate: defaultEffective,
      emergencyImmediate: false,
    })
    setShowPublishModal(true)
  }

  const handleConfirmPublish = async () => {
    if (!selectedPolicy) return
    setActionLoading(true)
    try {
      const res = await publishPolicy(selectedPolicy.id, publishForm)
      if (res.success && res.policy) {
        showToast(`Policy "${res.policy.title}" (${res.policy.version}) is now PUBLISHED & ACTIVE!`, 'success')
        setShowPublishModal(false)
        await loadData()
        setSelectedPolicy(res.policy)
      } else {
        showToast(res.error || 'Failed to publish policy', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error publishing policy', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmRequestChanges = async () => {
    if (!selectedPolicy || !reviewNotesInput.trim()) {
      showToast('Please provide review notes explaining requested changes', 'error')
      return
    }

    setActionLoading(true)
    try {
      const res = await requestPolicyChanges(selectedPolicy.id, reviewNotesInput)
      if (res.success && res.policy) {
        showToast(`Policy returned to draft with revision notes.`, 'success')
        setShowRejectModal(false)
        setReviewNotesInput('')
        await loadData()
        setSelectedPolicy(res.policy)
      } else {
        showToast(res.error || 'Failed to return policy to draft', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating review notes', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleArchivePolicy = async (policy: CompanyPolicy) => {
    if (!confirm(`Are you sure you want to archive "${policy.title}"? It will no longer be active for field staff.`)) {
      return
    }

    setActionLoading(true)
    try {
      const res = await archivePolicy(policy.id)
      if (res.success && res.policy) {
        showToast(`Policy "${res.policy.title}" moved to archives.`, 'success')
        await loadData()
        setSelectedPolicy(res.policy)
      } else {
        showToast(res.error || 'Failed to archive policy', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error archiving policy', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDispatchReminders = async (policy: CompanyPolicy) => {
    setActionLoading(true)
    try {
      const unsignedIds = ['tech_1', 'tech_2', 'tech_3']
      const res = await dispatchPolicyReminder(policy.id, unsignedIds)
      if (res.success) {
        showToast(`Compliance reminders dispatched to pending personnel.`, 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Error sending reminders', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Precise Effective Date Formatter (Future vs Past)
  const renderEffectiveDate = (policy: CompanyPolicy) => {
    const todayStr = '2026-10-25'
    const dateStr = policy.effective_date || 'Pending review'

    if (policy.status !== 'active') {
      return (
        <div className="flex flex-col min-w-0">
          <span className="font-mono font-bold text-xs text-[#121215] dark:text-[#F4F4F6]">
            {policy.version}
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
            Proposed: {dateStr}
          </span>
        </div>
      )
    }

    const isFuture = policy.effective_date > todayStr
    return (
      <div className="flex flex-col min-w-0">
        <span className="font-mono font-bold text-xs text-[#121215] dark:text-[#F4F4F6]">
          {policy.version}
        </span>
        <span className="text-[10px] text-[#8E8D9A]">
          {isFuture ? `Takes effect: ${dateStr}` : `Effective since: ${dateStr}`}
        </span>
      </div>
    )
  }

  // Lifecycle Status Pill
  const renderStatusBadge = (status: PolicyLifecycleStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Published Active</span>
          </span>
        )
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Under Review</span>
          </span>
        )
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Edit3 className="w-3 h-3 text-blue-500" />
            <span>Working Draft</span>
          </span>
        )
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8D9A] border border-black/[0.08] dark:border-white/[0.08]">
            <Archive className="w-3 h-3 text-[#8E8D9A]" />
            <span>Superseded / Archived</span>
          </span>
        )
    }
  }

  // Context-Adaptive Action Button Copy
  const getContextualActionLabel = (status: PolicyLifecycleStatus) => {
    switch (status) {
      case 'draft':
        return 'Continue editing'
      case 'under_review':
        return 'Review submission'
      case 'archived':
        return 'View archive'
      case 'active':
      default:
        return 'View details'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'hr_attendance':
      case 'employment':
      case 'attendance':
        return 'HR & Employment'
      case 'field_ops':
      case 'safety':
        return 'Field Safety & OSH'
      case 'inventory':
        return 'Tool Custody & Assets'
      case 'conduct':
        return 'Code of Conduct'
      case 'legal':
        return 'Legal & Privacy'
      case 'executive':
        return 'Executive Governance'
      default:
        return category.toUpperCase()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9FB] dark:bg-[#121215] overflow-hidden select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
              : 'bg-[#FAF9FB] dark:bg-[#22232A] border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Content Area: Standard Page Scrolling, Balanced Width */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-5xl mx-auto space-y-6">
          {/* 1. Header Area Matching Mockup media_1792933400147_76e5c751.png */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#121215] dark:text-[#F4F4F6]">
                Policies & Handbooks
              </h1>
              <p className="text-xs text-[#8E8D9A] dark:text-[#7A7C88] mt-1">
                Manage company policies and review outstanding tasks.
              </p>
            </div>

            {/* Primary Action: Create policy (Single Plus Icon) */}
            <button
              id="btn-create-policy"
              type="button"
              onClick={handleOpenCreateDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create policy</span>
            </button>
          </div>

          {/* 2. Unified 3-Segment Navigation Bar (Directly Matching Mockup) */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xl">
            <button
              type="button"
              id="btn-nav-workspace-tab"
              onClick={() => switchView('workspace')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                currentView === 'workspace'
                  ? 'bg-[#121215] text-white dark:bg-[#F4F4F6] dark:text-[#121215] shadow-xs'
                  : 'bg-[#F5F4F7] dark:bg-[#1E1F27] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] border border-black/[0.05] dark:border-white/[0.06]'
              }`}
            >
              Workspace
            </button>

            <button
              type="button"
              id="btn-nav-library-tab"
              onClick={() => switchView('library')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                currentView === 'library'
                  ? 'bg-[#121215] text-white dark:bg-[#F4F4F6] dark:text-[#121215] shadow-xs'
                  : 'bg-[#F5F4F7] dark:bg-[#1E1F27] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] border border-black/[0.05] dark:border-white/[0.06]'
              }`}
            >
              All policies
            </button>

            <button
              type="button"
              id="btn-view-master-handbook"
              onClick={() => setShowHandbookModal(true)}
              className="py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer text-center bg-[#F5F4F7] dark:bg-[#1E1F27] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] border border-black/[0.05] dark:border-white/[0.06]"
            >
              Master Handbook
            </button>
          </div>

          {/* VIEW 1: WORKSPACE (Directly Matching User Mockup media_1792933400147_76e5c751.png) */}
          {currentView === 'workspace' && (
            <div id="view-workspace" className="space-y-4 animate-in fade-in duration-150">
              {/* Section: Needs attention */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                      Needs attention
                    </h2>
                    {allAttentionItems.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        {allAttentionItems.length} items
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8E8D9A] dark:text-[#7A7C88] mt-0.5">
                    Prioritized governance tasks: approvals and overdue compliance sorted first.
                  </p>
                </div>

                {/* Scannable Triage Segmented Filter */}
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setWorkspaceFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      workspaceFilter === 'all'
                        ? 'bg-[#4D55CC] text-white shadow-xs'
                        : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                    }`}
                  >
                    All tasks ({allAttentionItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspaceFilter('urgent')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      workspaceFilter === 'urgent'
                        ? 'bg-[#4D55CC] text-white shadow-xs'
                        : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                    }`}
                  >
                    Urgent actions ({allAttentionItems.filter(p => p.status === 'under_review' || p.status === 'active').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspaceFilter('drafts')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      workspaceFilter === 'drafts'
                        ? 'bg-[#4D55CC] text-white shadow-xs'
                        : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                    }`}
                  >
                    Drafts ({allAttentionItems.filter(p => p.status === 'draft').length})
                  </button>
                </div>
              </div>

              {/* Work Queue Card Container with inner divider lines */}
              {attentionItems.length > 0 ? (
                <div className="rounded-2xl bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.06] overflow-hidden shadow-xs">
                  {attentionItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedPolicy(item)
                        setInspectorTab('document')
                      }}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            item.status === 'under_review'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : item.status === 'draft'
                              ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {item.status === 'under_review' ? (
                            <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          ) : item.status === 'draft' ? (
                            <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          ) : (
                            <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Task Classification & Urgency Header */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                item.status === 'under_review'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : item.status === 'draft'
                                  ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              }`}
                            >
                              {item.status === 'under_review'
                                ? 'Review needed'
                                : item.status === 'draft'
                                ? 'Working draft'
                                : 'Compliance follow-up'}
                            </span>

                            {item.effective_date && (
                              <span className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] font-medium">
                                {item.status === 'active'
                                  ? `Mandatory · Enacted since ${item.effective_date}`
                                  : `Target effective: ${item.effective_date}`}
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-sm text-[#121215] dark:text-[#F4F4F6] truncate group-hover:text-[#4D55CC] dark:group-hover:text-indigo-400 transition-colors">
                            {item.title}
                          </h3>

                          <p className="text-xs text-[#8E8D9A] dark:text-[#7A7C88] mt-0.5">
                            {item.status === 'under_review'
                              ? 'Awaiting reviewer sign-off before formal workforce rollout'
                              : item.status === 'draft'
                              ? 'Draft in progress · Continue editing or submit for review'
                              : `${policySignaturesMap[item.id]?.eligibleCount ? (policySignaturesMap[item.id].eligibleCount - policySignaturesMap[item.id].signedCount) : 34} personnel pending signature (${policySignaturesMap[item.id]?.signedPercent || 0}% signed)`}
                          </p>
                        </div>
                      </div>

                      {/* Right: Next Action link with arrow */}
                      <div className="shrink-0 flex items-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all group-hover:translate-x-0.5 ${
                            item.status === 'under_review'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500/25'
                              : item.status === 'draft'
                              ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 group-hover:bg-slate-500/25'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 group-hover:bg-rose-500/25'
                          }`}
                        >
                          {item.status === 'under_review' ? (
                            <>Review <span aria-hidden="true">&rarr;</span></>
                          ) : item.status === 'draft' ? (
                            <>Continue edit <span aria-hidden="true">&rarr;</span></>
                          ) : (
                            <>Follow up <span aria-hidden="true">&rarr;</span></>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.08] text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                    You're all caught up
                  </h4>
                  <p className="text-xs text-[#8E8D9A] max-w-sm mx-auto">
                    No policies currently require review, approval, or follow-up.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchView('library')}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4D55CC] text-white text-xs font-bold hover:bg-[#4338CA] transition-colors cursor-pointer"
                  >
                    <span>Browse Policy Library</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Footer: Showing the most relevant tasks first | View all N -> */}
              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <span className="text-[#8E8D9A]">Showing the most relevant tasks first</span>
                <button
                  type="button"
                  id="btn-view-all-queue"
                  onClick={() => switchView('library')}
                  className="font-bold text-[#121215] dark:text-[#F4F4F6] hover:text-[#4D55CC] dark:hover:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>View all {policies.length}</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>
          )}

        {/* VIEW 2: ALL POLICIES LIBRARY (Matching Reference Layout Image 2) */}
        {currentView === 'library' && (
          <div id="view-library" className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden animate-in fade-in duration-200">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <div>
                <button
                  type="button"
                  id="btn-back-to-workspace"
                  onClick={() => switchView('workspace')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] transition-colors mb-1 cursor-pointer group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to workspace</span>
                </button>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                    All policies
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#4D55CC]/10 text-[#4D55CC] dark:text-indigo-400 border border-[#4D55CC]/20">
                    {policies.length} policies
                  </span>
                </div>
                <p className="text-xs text-[#8E8D9A] mt-0.5">
                  Find the document you need.
                </p>
              </div>

              {/* Search Bar matching reference image */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-[#8E8D9A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input-search-policies"
                  placeholder="Search by policy name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F5F4F7] dark:bg-[#1E1F27] text-xs text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] focus:outline-none focus:ring-1 focus:ring-[#4D55CC] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs: All policies | Published | Drafts & review | Archived */}
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-0.5">
              <button
                type="button"
                id="tab-filter-all"
                onClick={() => setLibraryTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  libraryTab === 'all'
                    ? 'bg-[#121215] text-white dark:bg-[#F4F4F6] dark:text-[#121215] shadow-xs'
                    : 'bg-[#F5F4F7] dark:bg-[#1E1F27] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] border border-black/[0.04] dark:border-white/[0.04]'
                }`}
              >
                All policies ({policies.length})
              </button>
              <button
                type="button"
                id="tab-filter-published"
                onClick={() => setLibraryTab('published')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  libraryTab === 'published'
                    ? 'bg-[#121215] text-white dark:bg-[#F4F4F6] dark:text-[#121215] shadow-xs'
                    : 'bg-[#F5F4F7] dark:bg-[#1E1F27] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] border border-black/[0.04] dark:border-white/[0.04]'
                }`}
              >
                <span>Published</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {complianceStats.activePolicies}
                </span>
              </button>
              <button
                type="button"
                id="tab-filter-drafts-review"
                onClick={() => setLibraryTab('drafts_review')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  libraryTab === 'drafts_review'
                    ? 'bg-[#121215] text-white dark:bg-[#F4F4F6] dark:text-[#121215] shadow-xs'
                    : 'bg-[#F5F4F7] dark:bg-[#1E1F27] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] border border-black/[0.04] dark:border-white/[0.04]'
                }`}
              >
                <span>Drafts & review</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold">
                  {complianceStats.underReviewPolicies + complianceStats.draftPolicies}
                </span>
              </button>
              <button
                type="button"
                id="tab-filter-archived"
                onClick={() => setLibraryTab('archived')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  libraryTab === 'archived'
                    ? 'bg-[#121215] text-white dark:bg-[#F4F4F6] dark:text-[#121215] shadow-xs'
                    : 'bg-[#F5F4F7] dark:bg-[#1E1F27] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] border border-black/[0.04] dark:border-white/[0.04]'
                }`}
              >
                <span>Archived</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/[0.06] dark:bg-white/[0.08] text-[#8E8D9A] font-extrabold">
                  {complianceStats.archivedPolicies}
                </span>
              </button>
            </div>

            {/* Minimalist 4-Column Table */}
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#F5F4F7] dark:bg-[#1E1F27] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#EBEAEF] dark:bg-[#262732] border-b border-black/[0.08] dark:border-white/[0.08] text-[11px] font-bold text-[#575762] dark:text-[#B0B2BD] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 min-w-[280px]">Policy</th>
                      <th className="py-3 px-4 min-w-[130px]">Status</th>
                      <th className="py-3 px-4 min-w-[140px]">Last updated</th>
                      <th className="py-3 px-4 text-right min-w-[130px]">Next step</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/[0.08] dark:divide-white/[0.08] text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-[#8E8D9A]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#4D55CC]" />
                            <span>Loading policies...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPolicies.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-[#8E8D9A]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ScrollText className="w-8 h-8 text-[#8E8D9A]" />
                            <span className="font-bold">No policies found</span>
                            <span className="text-[11px]">
                              Try adjusting your search query or switching tabs.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPolicies.map((policy) => {
                        const isSelected = selectedPolicy?.id === policy.id
                        return (
                          <tr
                            key={policy.id}
                            onClick={() => {
                              setSelectedPolicy(policy)
                              setInspectorTab('document')
                            }}
                            className={`cursor-pointer transition-colors border-b border-black/[0.08] dark:border-white/[0.08] ${
                              isSelected
                                ? 'bg-blue-500/10 dark:bg-blue-950/30'
                                : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                            }`}
                          >
                            {/* Column 1: Policy (Title + Category Subtitle) */}
                            <td className="py-3 px-4">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center shrink-0 border border-blue-500/20 mt-0.5">
                                  <ScrollText className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-extrabold text-[#121215] dark:text-[#F4F4F6] truncate">
                                    {policy.title}
                                  </span>
                                  <span className="text-[11px] text-[#8E8D9A] dark:text-[#7A7C88] mt-0.5">
                                    {getCategoryLabel(policy.category)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Column 2: Minimalist Status Pill */}
                            <td className="py-3 px-4">
                              {policy.status === 'active' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Published</span>
                                </span>
                              ) : policy.status === 'under_review' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Under review</span>
                                </span>
                              ) : policy.status === 'draft' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                                  <Edit3 className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>Draft</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8D9A] border border-black/[0.08] dark:border-white/[0.08]">
                                  <Archive className="w-3 h-3 text-[#8E8D9A] shrink-0" />
                                  <span>Archived</span>
                                </span>
                              )}
                            </td>

                            {/* Column 3: Last updated */}
                            <td className="py-3 px-4">
                              <span className="text-xs text-[#575762] dark:text-[#B0B2BD] font-medium">
                                {formatLastUpdated(policy)}
                              </span>
                            </td>

                            {/* Column 4: Next step Contextual Action */}
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedPolicy(policy)
                                  setInspectorTab('document')
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] hover:bg-[#4D55CC] hover:text-white dark:hover:bg-[#4D55CC] dark:hover:text-white text-[#121215] dark:text-[#F4F4F6] text-xs font-bold transition-colors cursor-pointer"
                              >
                                {policy.status === 'active'
                                  ? 'View policy'
                                  : policy.status === 'under_review'
                                  ? 'Review policy'
                                  : policy.status === 'draft'
                                  ? 'Continue editing'
                                  : 'View archive'}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* 6. 620px Floating Slide-Over Inspector Drawer & Overlay */}
      {selectedPolicy && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] z-40 transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedPolicy(null)}
            aria-hidden="true"
          />

          {/* Floating Slide-Over Sheet (620px width) */}
          <aside
            aria-label="Policy Document Inspector"
            className="fixed top-3 sm:top-4 bottom-3 sm:bottom-4 right-3 sm:right-4 w-[560px] md:w-[620px] max-w-[calc(100vw-32px)] z-50 bg-[#FAF9FB] dark:bg-[#1E1F27] rounded-[24px] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-6 duration-200"
          >
            {/* Inspector Header */}
            <div className="p-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-[#F5F4F7] dark:bg-[#22232A]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#4D55CC] dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-500/20">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-extrabold text-sm text-[#121215] dark:text-[#F4F4F6] truncate">
                    {selectedPolicy.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-[#8E8D9A] dark:text-[#7A7C88]">
                    <span className="font-mono font-bold">{selectedPolicy.version}</span>
                    <span>•</span>
                    <span>{getCategoryLabel(selectedPolicy.category)}</span>
                    <span>•</span>
                    {renderStatusBadge(selectedPolicy.status)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="p-1.5 rounded-xl text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                title="Close inspector (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Sub-Tabs */}
            <div className="px-4 pt-2.5 flex items-center gap-4 border-b border-black/[0.08] dark:border-white/[0.08] shrink-0 bg-[#FAF9FB] dark:bg-[#1E1F27]">
              <button
                type="button"
                onClick={() => setInspectorTab('document')}
                className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer relative ${
                  inspectorTab === 'document'
                    ? 'text-[#4D55CC] dark:text-indigo-400 border-b-2 border-[#4D55CC] dark:border-indigo-400'
                    : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                }`}
              >
                Policy Document
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('compliance')}
                className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer relative flex items-center gap-1.5 ${
                  inspectorTab === 'compliance'
                    ? 'text-[#4D55CC] dark:text-indigo-400 border-b-2 border-[#4D55CC] dark:border-indigo-400'
                    : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                }`}
              >
                <span>Employee Acknowledgments</span>
                {selectedPolicy.status === 'active' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 font-extrabold">
                    {policySignaturesMap[selectedPolicy.id]?.signedPercent || 0}%
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('history')}
                className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer relative ${
                  inspectorTab === 'history'
                    ? 'text-[#4D55CC] dark:text-indigo-400 border-b-2 border-[#4D55CC] dark:border-indigo-400'
                    : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                }`}
              >
                Version History & Audit
              </button>
            </div>

            {/* Inspector Tab Body Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB 1: Policy Document View (Semantic Typography without Raw Markdown Leaks) */}
              {inspectorTab === 'document' && (
                <div className="space-y-4">
                  {/* Scope & Directive Summary Card */}
                  <div className="p-3.5 rounded-xl bg-[#F5F4F7] dark:bg-[#22232A] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                    <span className="text-[11px] font-bold text-[#8E8D9A] uppercase tracking-wider">
                      Executive Directive & Purpose
                    </span>
                    <p className="text-xs text-[#121215] dark:text-[#F4F4F6] leading-relaxed">
                      {selectedPolicy.summary}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.07] text-[11px]">
                      <div>
                        <span className="text-[#8E8D9A]">Target Audience: </span>
                        <span className="font-semibold text-[#121215] dark:text-[#F4F4F6] capitalize">
                          {selectedPolicy.target_audience === 'all'
                            ? 'All Company Personnel (45 staff)'
                            : selectedPolicy.target_audience === 'technician'
                            ? 'Field Technicians & Helpers (35 staff)'
                            : 'Administrative Staff (10 staff)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8E8D9A]">Signature Obligation: </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {selectedPolicy.is_mandatory ? 'Mandatory for Employment' : 'Voluntary Guidance'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Notes & Workflow Clarification Banner */}
                  {selectedPolicy.review_notes && (
                    <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      selectedPolicy.status === 'draft'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                        : selectedPolicy.status === 'under_review'
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-900 dark:text-indigo-200'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {selectedPolicy.status === 'draft'
                              ? 'Pre-Review Status & Required Action'
                              : selectedPolicy.status === 'under_review'
                              ? 'Active Review in Progress'
                              : 'Approval & Governance Notes'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-bold">
                          {selectedPolicy.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[#575762] dark:text-[#B0B2BD] text-[11px] leading-relaxed">
                        {selectedPolicy.review_notes}
                      </p>
                      {selectedPolicy.status === 'draft' && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium pt-1 border-t border-amber-500/20">
                          Next Action: Click "{selectedPolicy.review_notes?.toLowerCase().includes('coordinator') || ['safety', 'field_ops', 'inventory'].includes(selectedPolicy.category) ? 'Request Coordinator Review' : 'Submit for Formal Review'}" below to formally assign this policy and advance it to "Under review".
                        </p>
                      )}
                    </div>
                  )}

                  {/* Formatted Markdown Reader via FormattedPolicyDocument */}
                  <div className="p-4 rounded-xl bg-[#FAF9FB] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.08]">
                    <FormattedPolicyDocument content={selectedPolicy.content_markdown} />
                  </div>
                </div>
              )}

              {/* TAB 2: Employee Acknowledgments & Signature Ledger */}
              {inspectorTab === 'compliance' && (
                <div className="space-y-4">
                  {/* Top Compliance Dial with Dynamic Audience Agreement */}
                  {selectedPolicy.status === 'active' ? (
                    <div className="p-4 rounded-xl bg-[#F5F4F7] dark:bg-[#22232A] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-[#8E8D9A] uppercase tracking-wider block mb-1">
                          Workforce Acknowledgment Standing
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                            {policySignaturesMap[selectedPolicy.id]?.signedPercent || 0}%
                          </span>
                          <span className="text-xs text-[#8E8D9A]">
                            ({policySignaturesMap[selectedPolicy.id]?.signedCount || 0} of {policySignaturesMap[selectedPolicy.id]?.eligibleCount || 35} {policySignaturesMap[selectedPolicy.id]?.audienceLabel || 'personnel'} signed)
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDispatchReminders(selectedPolicy)}
                        disabled={actionLoading}
                        className="px-3.5 py-2 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Reminder</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[#8E8D9A] text-center">
                      <Clock className="w-5 h-5 mx-auto mb-1.5 text-amber-500" />
                      <span className="font-bold text-[#121215] dark:text-[#F4F4F6] block mb-0.5">
                        Document Not Yet Published
                      </span>
                      Employee signature tracking begins automatically once this policy is formally published and effective.
                    </div>
                  )}

                  {/* Personnel Acknowledgment Roster */}
                  {selectedPolicy.status === 'active' && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                        Signed Acknowledgment Audit Records
                      </span>

                      <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] rounded-xl overflow-hidden bg-[#FAF9FB] dark:bg-[#1E1F27]">
                        {policySignaturesMap[selectedPolicy.id]?.signedUsers?.length === 0 ? (
                          <div className="p-6 text-center text-xs text-[#8E8D9A]">
                            No signatures recorded for this version yet.
                          </div>
                        ) : (
                          policySignaturesMap[selectedPolicy.id]?.signedUsers?.map((ack) => (
                            <div key={ack.id} className="p-3 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-[10px] flex items-center justify-center">
                                  ✓
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">
                                    {ack.user?.full_name || `Employee (${ack.user_id.slice(0, 8)})`}
                                  </span>
                                  <span className="text-[10px] text-[#8E8D9A]">
                                    {ack.user?.role === 'technician' ? 'HVAC Technician' : 'Field Personnel'} · IP: {ack.ip_address || 'Kiosk Device'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-[#8E8D9A]">
                                {ack.acknowledged_at ? new Date(ack.acknowledged_at).toLocaleDateString() : 'Active'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Version History & Audit Log */}
              {inspectorTab === 'history' && (
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                    Governance Lifecycle Timeline
                  </span>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-black/[0.08] dark:before:bg-white/[0.08]">
                    {/* Item 1: Current State with Precise Date Description */}
                    <div className="relative flex items-start gap-3">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-[#4D55CC] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                        1
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-xs text-[#121215] dark:text-[#F4F4F6]">
                          Current Version {selectedPolicy.version} ({selectedPolicy.status.toUpperCase()})
                        </span>
                        <span className="text-[11px] text-[#8E8D9A]">
                          {selectedPolicy.status !== 'active'
                            ? `Proposed effective date: ${selectedPolicy.effective_date || 'Oct 31, 2026'}`
                            : selectedPolicy.effective_date > '2026-10-25'
                            ? `Takes effect: ${selectedPolicy.effective_date}`
                            : `Effective since: ${selectedPolicy.effective_date}`}
                        </span>
                        {selectedPolicy.review_notes && (
                          <span className="text-[10px] text-amber-600 font-medium">
                            Notes: {selectedPolicy.review_notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Item 2: Genesis Version */}
                    <div className="relative flex items-start gap-3">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-black/[0.1] dark:bg-white/[0.1] text-[#8E8D9A] flex items-center justify-center text-[10px] font-bold">
                        2
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-xs text-[#121215] dark:text-[#F4F4F6]">
                          Initial Enactment (v1.0.0)
                        </span>
                        <span className="text-[11px] text-[#8E8D9A]">
                          Created on {selectedPolicy.created_at ? new Date(selectedPolicy.created_at).toLocaleDateString() : 'Oct 17, 2026'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Context-Adaptive Sticky Action Footer */}
            <div className="p-4 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#1E1F27] flex flex-col gap-2 shrink-0">
              {/* State A: DRAFT */}
              {selectedPolicy.status === 'draft' && (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-submit-review"
                    type="button"
                    onClick={() => handleSubmitForReview(selectedPolicy)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {selectedPolicy.review_notes?.toLowerCase().includes('coordinator') ||
                       ['safety', 'field_ops', 'inventory'].includes(selectedPolicy.category)
                        ? 'Request Coordinator Review'
                        : 'Submit for Formal Review'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftForm({
                        title: selectedPolicy.title,
                        category: selectedPolicy.category,
                        version: selectedPolicy.version,
                        target_audience: selectedPolicy.target_audience,
                        effective_date: selectedPolicy.effective_date,
                        summary: selectedPolicy.summary,
                        content_markdown: selectedPolicy.content_markdown,
                        is_mandatory: selectedPolicy.is_mandatory,
                      })
                      setShowEditDraftModal(true)
                    }}
                    className="px-4 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-[#121215] dark:text-[#F4F4F6] text-xs font-bold hover:bg-black/[0.06] transition-colors cursor-pointer"
                  >
                    Edit Draft
                  </button>
                </div>
              )}

              {/* State B: UNDER REVIEW */}
              {selectedPolicy.status === 'under_review' && (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-approve-publish"
                    type="button"
                    onClick={() => handleOpenPublishModal(selectedPolicy)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Approve & Publish Policy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Request Changes
                  </button>
                </div>
              )}

              {/* State C: ACTIVE / PUBLISHED */}
              {selectedPolicy.status === 'active' && (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-fork-revision"
                    type="button"
                    onClick={() => handleForkRevision(selectedPolicy)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Revise Policy (Fork Draft)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchivePolicy(selectedPolicy)}
                    className="px-4 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-[#8E8D9A] hover:text-rose-600 hover:border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Archive
                  </button>
                </div>
              )}

              {/* State D: ARCHIVED */}
              {selectedPolicy.status === 'archived' && (
                <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-center text-xs text-[#8E8D9A]">
                  Archived version retained for historical DOLE compliance audits.
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* 7. CREATE POLICY DRAFT MODAL (3-Step Guided Workflow with Preview) */}
      {showCreateModal && (
        <ModalDialog
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Policy"
          subtitle="Formulate and schedule company policies with live formatting review."
          maxWidth="lg"
        >
          {/* Stepper Header */}
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateStep(1)}
                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors ${
                  createStep === 1
                    ? 'text-[#4D55CC] dark:text-indigo-400'
                    : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  createStep === 1 ? 'bg-[#4D55CC] text-white' : 'bg-black/[0.06] dark:bg-white/[0.08]'
                }`}>
                  1
                </span>
                <span>Basic Details</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-[#8E8D9A]" />
              <button
                type="button"
                onClick={() => {
                  if (!draftForm.title.trim()) {
                    setTitleError('Policy title is required.')
                    setCreateStep(1)
                    titleInputRef.current?.focus()
                    return
                  }
                  setTitleError(null)
                  setCreateStep(2)
                }}
                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors ${
                  createStep === 2
                    ? 'text-[#4D55CC] dark:text-indigo-400'
                    : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  createStep === 2 ? 'bg-[#4D55CC] text-white' : 'bg-black/[0.06] dark:bg-white/[0.08]'
                }`}>
                  2
                </span>
                <span>Content & Preview</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-[#8E8D9A]" />
              <button
                type="button"
                onClick={() => {
                  if (!draftForm.title.trim()) {
                    setTitleError('Policy title is required.')
                    setCreateStep(1)
                    titleInputRef.current?.focus()
                    return
                  }
                  setTitleError(null)
                  setCreateStep(3)
                }}
                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors ${
                  createStep === 3
                    ? 'text-[#4D55CC] dark:text-indigo-400'
                    : 'text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  createStep === 3 ? 'bg-[#4D55CC] text-white' : 'bg-black/[0.06] dark:bg-white/[0.08]'
                }`}>
                  3
                </span>
                <span>Review & Schedule</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveNewDraft} className="space-y-4">
            {/* STEP 1: Basic Information */}
            {createStep === 1 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                    Policy Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    required
                    id="input-create-policy-title"
                    aria-invalid={!!titleError}
                    aria-describedby={titleError ? 'policy-title-error' : undefined}
                    value={draftForm.title}
                    onChange={(e) => {
                      setDraftForm({ ...draftForm, title: e.target.value })
                      if (titleError && e.target.value.trim()) {
                        setTitleError(null)
                      }
                    }}
                    placeholder="e.g. Service Vehicle Operation & Fuel Liquidation Policy"
                    className={`w-full px-3 py-2 rounded-xl border text-xs text-[#121215] dark:text-[#F4F4F6] focus:outline-none transition-colors ${
                      titleError
                        ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20 dark:border-rose-500'
                        : 'border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] focus:ring-1 focus:ring-[#4D55CC]'
                    }`}
                  />
                  {titleError && (
                    <p
                      id="policy-title-error"
                      className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in duration-150"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{titleError}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                      Governance Domain
                    </label>
                    <select
                      value={draftForm.category}
                      onChange={(e) => setDraftForm({ ...draftForm, category: e.target.value as PolicyCategory })}
                      className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs font-semibold text-[#121215] dark:text-[#F4F4F6]"
                    >
                      <option value="hr_attendance">HR & Employment</option>
                      <option value="field_ops">Field Safety & OSH</option>
                      <option value="inventory">Tool Custody & Assets</option>
                      <option value="conduct">Code of Conduct</option>
                      <option value="legal">Legal & Privacy</option>
                      <option value="executive">Executive Governance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                      Target Audience
                    </label>
                    <select
                      value={draftForm.target_audience}
                      onChange={(e) => setDraftForm({ ...draftForm, target_audience: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs font-semibold text-[#121215] dark:text-[#F4F4F6]"
                    >
                      <option value="all">All Company Personnel (45 staff)</option>
                      <option value="technician">Field Technicians & Helpers (35 staff)</option>
                      <option value="admin">Administrative Staff (10 staff)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                    Executive Directive / Summary
                  </label>
                  <textarea
                    rows={3}
                    value={draftForm.summary}
                    onChange={(e) => setDraftForm({ ...draftForm, summary: e.target.value })}
                    placeholder="Provide a concise 1-2 sentence mandate outlining why this policy exists..."
                    className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6] focus:outline-none focus:ring-1 focus:ring-[#4D55CC]"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Content & Preview */}
            {createStep === 2 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD]">
                    Policy Document Body
                  </label>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.07]">
                    <button
                      type="button"
                      onClick={() => setCreatePreviewMode(false)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                        !createPreviewMode
                          ? 'bg-[#FAF9FB] dark:bg-[#1E1F27] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                          : 'text-[#8E8D9A] hover:text-[#121215]'
                      }`}
                    >
                      Edit Text
                    </button>
                    <button
                      type="button"
                      id="btn-preview-policy-doc"
                      onClick={() => setCreatePreviewMode(true)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                        createPreviewMode
                          ? 'bg-[#FAF9FB] dark:bg-[#1E1F27] text-[#4D55CC] dark:text-indigo-400 shadow-xs'
                          : 'text-[#8E8D9A] hover:text-[#121215]'
                      }`}
                    >
                      Formatted Preview
                    </button>
                  </div>
                </div>

                {!createPreviewMode ? (
                  <textarea
                    rows={9}
                    value={draftForm.content_markdown}
                    onChange={(e) => setDraftForm({ ...draftForm, content_markdown: e.target.value })}
                    placeholder="# Policy Title&#10;&#10;### 1. Corporate Scope&#10;Detail the operational mandate..."
                    className="w-full p-3 font-mono text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-[#121215] dark:text-[#F4F4F6] focus:outline-none focus:ring-1 focus:ring-[#4D55CC]"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#1E1F27] max-h-60 overflow-y-auto">
                    <FormattedPolicyDocument content={draftForm.content_markdown || '*No content entered yet.*'} />
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Review & Schedule */}
            {createStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                      Proposed Effective Date
                    </label>
                    <input
                      type="date"
                      value={draftForm.effective_date}
                      onChange={(e) => setDraftForm({ ...draftForm, effective_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs font-semibold text-[#121215] dark:text-[#F4F4F6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                      Compliance Enforcement
                    </label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="is_mandatory_cb"
                        checked={draftForm.is_mandatory}
                        onChange={(e) => setDraftForm({ ...draftForm, is_mandatory: e.target.checked })}
                        className="rounded border-black/20 text-[#4D55CC] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="is_mandatory_cb" className="text-xs font-semibold text-[#121215] dark:text-[#F4F4F6] cursor-pointer">
                        Mandatory Policy
                      </label>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="p-3.5 rounded-xl bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                  <span className="text-[11px] font-bold text-[#8E8D9A] uppercase tracking-wider block">
                    Policy Pre-Flight Summary
                  </span>
                  <div className="text-xs space-y-1 text-[#121215] dark:text-[#F4F4F6]">
                    <div><span className="text-[#8E8D9A]">Title: </span><span className="font-bold">{draftForm.title || 'Untitled'}</span></div>
                    <div><span className="text-[#8E8D9A]">Domain: </span><span className="font-semibold">{getCategoryLabel(draftForm.category)}</span></div>
                    <div><span className="text-[#8E8D9A]">Audience: </span><span className="capitalize">{draftForm.target_audience}</span></div>
                    <div><span className="text-[#8E8D9A]">Proposed Date: </span><span>{draftForm.effective_date || 'Pending'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              {/* Persistent Save Draft on Any Step */}
              <button
                type="button"
                id="btn-save-draft"
                onClick={handleSaveNewDraft}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#4D55CC] dark:text-indigo-400 hover:bg-[#4D55CC]/10 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Working Draft</span>
              </button>

              <div className="flex items-center gap-2">
                {createStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCreateStep((s) => (s > 1 ? ((s - 1) as any) : s))}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                )}

                {createStep < 3 ? (
                  <button
                    type="button"
                    id="btn-next-create-step"
                    onClick={() => {
                      if (!draftForm.title.trim()) {
                        setTitleError('Policy title is required.')
                        setCreateStep(1)
                        titleInputRef.current?.focus()
                        return
                      }
                      setTitleError(null)
                      setCreateStep((s) => (s < 3 ? ((s + 1) as any) : s))
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4D55CC] hover:bg-[#4338CA] text-white flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    id="btn-finalize-create-policy"
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Complete & Save Draft</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* 8. EDIT WORKING DRAFT MODAL */}
      {showEditDraftModal && selectedPolicy && (
        <ModalDialog
          isOpen={showEditDraftModal}
          onClose={() => setShowEditDraftModal(false)}
          title={`Edit Draft: ${selectedPolicy.title}`}
          subtitle={`Editing version ${selectedPolicy.version}.`}
          maxWidth="lg"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setActionLoading(true)
              try {
                const res = await updatePolicyDraft({
                  id: selectedPolicy.id,
                  ...draftForm,
                })
                if (res.success && res.policy) {
                  showToast('Draft revisions saved successfully!', 'success')
                  setShowEditDraftModal(false)
                  await loadData()
                  setSelectedPolicy(res.policy)
                } else {
                  showToast(res.error || 'Failed to update draft', 'error')
                }
              } catch (err: any) {
                showToast(err.message || 'Error updating draft', 'error')
              } finally {
                setActionLoading(false)
              }
            }}
            className="space-y-3 pt-2"
          >
            <div>
              <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                Policy Title
              </label>
              <input
                type="text"
                required
                value={draftForm.title}
                onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                Executive Directive / Summary
              </label>
              <textarea
                required
                rows={2}
                value={draftForm.summary}
                onChange={(e) => setDraftForm({ ...draftForm, summary: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                Policy Content
              </label>
              <textarea
                required
                rows={8}
                value={draftForm.content_markdown}
                onChange={(e) => setDraftForm({ ...draftForm, content_markdown: e.target.value })}
                className="w-full p-3 font-mono text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-[#121215] dark:text-[#F4F4F6]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowEditDraftModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#575762]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4D55CC] hover:bg-[#4338CA] text-white flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* 9. PUBLISH POLICY CONFIRMATION MODAL */}
      {showPublishModal && selectedPolicy && (
        <ModalDialog
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          title={`Publish Policy: ${selectedPolicy.title}`}
          subtitle="Enact this policy as official, enforceable TechnoCycle regulation."
          maxWidth="md"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
              <span className="font-bold text-[#4D55CC] dark:text-indigo-400">
                Governance Verification
              </span>
              <p className="text-[11px] text-[#575762] dark:text-[#B0B2BD]">
                Publishing transitions this document to active status and supersedes prior revisions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                Effective Date
              </label>
              <input
                type="date"
                value={publishForm.effectiveDate}
                onChange={(e) => setPublishForm({ ...publishForm, effectiveDate: e.target.value })}
                disabled={publishForm.emergencyImmediate}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6]"
              />
              <span className="text-[10px] text-[#8E8D9A] mt-1 block">
                Standard practice allows 3 business days lead time for workforce ingestion.
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cb_material_change"
                  checked={publishForm.isMaterialChange}
                  onChange={(e) => setPublishForm({ ...publishForm, isMaterialChange: e.target.checked })}
                  className="rounded border-black/20 text-[#4D55CC]"
                />
                <label htmlFor="cb_material_change" className="text-xs font-semibold text-[#121215] dark:text-[#F4F4F6] cursor-pointer">
                  Material Policy Change (Mandate workforce re-acknowledgment)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cb_emergency"
                  checked={publishForm.emergencyImmediate}
                  onChange={(e) => setPublishForm({ ...publishForm, emergencyImmediate: e.target.checked })}
                  className="rounded border-black/20 text-amber-600"
                />
                <label htmlFor="cb_emergency" className="text-xs font-semibold text-amber-700 dark:text-amber-400 cursor-pointer">
                  Emergency Enactment (Immediate active enforcement today)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#575762]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Publish</span>
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* 10. REQUEST CHANGES / REJECT MODAL */}
      {showRejectModal && selectedPolicy && (
        <ModalDialog
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Request Policy Revisions"
          subtitle="Return document to working draft with constructive feedback."
          maxWidth="sm"
        >
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                Review Feedback & Required Adjustments
              </label>
              <textarea
                required
                rows={4}
                value={reviewNotesInput}
                onChange={(e) => setReviewNotesInput(e.target.value)}
                placeholder="Explain the legal or operational modifications needed..."
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#575762]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRequestChanges}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Return to Draft</span>
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* 11. MASTER EMPLOYEE HANDBOOK COMPILATION MODAL */}
      {showHandbookModal && (
        <ModalDialog
          isOpen={showHandbookModal}
          onClose={() => setShowHandbookModal(false)}
          title="TechnoCycle Master Employee Handbook"
          subtitle="Official compiled manual of all currently published and active corporate regulations."
          maxWidth="3xl"
        >
          <div className="space-y-6 pt-1">
            {/* Handbook Header Cover */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#F5F4F7] to-[#FAF9FB] dark:from-[#22232A] dark:to-[#1E1F27] border border-black/[0.08] dark:border-white/[0.1] text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#4D55CC] text-white flex items-center justify-center mx-auto shadow-md">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                TechnoCycle Corporation Employee & Field Operations Handbook
              </h2>
              <span className="text-xs text-[#8E8D9A] block font-mono">
                Official Compilation · Pacita Complex, San Pedro, Laguna, Philippines
              </span>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#4D55CC] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#4338CA] transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Export PDF</span>
                </button>
              </div>
            </div>

            {/* Table of Contents */}
            <div className="p-4 rounded-xl bg-[#FAF9FB] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.08] space-y-2">
              <span className="text-xs font-extrabold text-[#121215] dark:text-[#F4F4F6] uppercase tracking-wider">
                Table of Contents (Active Published Directives)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {policies
                  .filter((p) => p.status === 'active' || p.is_active)
                  .map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2 text-[#575762] dark:text-[#B0B2BD]">
                      <span className="font-mono text-[#8E8D9A]">{idx + 1}.</span>
                      <span className="font-semibold truncate">{p.title}</span>
                      <span className="text-[10px] text-[#8E8D9A] font-mono shrink-0">({p.version})</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Compiled Policy Articles Formatted via FormattedPolicyDocument */}
            <div className="space-y-6 divide-y divide-black/[0.08] dark:divide-white/[0.08]">
              {policies
                .filter((p) => p.status === 'active' || p.is_active)
                .map((p, idx) => (
                  <div key={p.id} className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-[#121215] dark:text-[#F4F4F6]">
                        {idx + 1}. {p.title}
                      </h4>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8D9A]">
                        {p.version} · Eff: {p.effective_date}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-[#22232A] border border-black/[0.06] dark:border-white/[0.08]">
                      <FormattedPolicyDocument content={p.content_markdown} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
