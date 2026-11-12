'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  FolderOpen,
  UploadCloud,
  AlertTriangle,
  FileText,
  CheckCircle2,
  X,
  Send,
  Phone,
  Settings,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UserCheck,
  Download,
  AlertCircle,
  FileCheck,
  Check,
  Clock,
  MoreVertical,
  ShieldAlert,
  ArrowRight,
  Loader2,
  User,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import ModalDialog from '@/components/ui/ModalDialog'
import { logAdminActivity } from '@/lib/auditLogger'

// ---------------------------------------------------------------------------
// Document Requirement Schema
// ---------------------------------------------------------------------------
export type DocRequirement = {
  key: string
  label: string
  desc: string
  category: 'statutory' | 'operational' | 'standard'
  isMandatory: boolean
}

export const REQUIRED_DOCUMENTS: DocRequirement[] = [
  {
    key: 'has_sss_id',
    label: 'SSS Registration / ID',
    desc: 'Mandatory social security number for statutory remittance.',
    category: 'statutory',
    isMandatory: true,
  },
  {
    key: 'has_philhealth_id',
    label: 'PhilHealth ID / MDR',
    desc: 'National health insurance membership registration.',
    category: 'statutory',
    isMandatory: true,
  },
  {
    key: 'has_pagibig_id',
    label: 'Pag-IBIG Membership (MID)',
    desc: 'Home Development Mutual Fund registration number.',
    category: 'statutory',
    isMandatory: false,
  },
  {
    key: 'has_medical_clearance',
    label: 'Medical Certificate (Fit to Work)',
    desc: 'Physical health clearance for industrial HVAC operations.',
    category: 'operational',
    isMandatory: true,
  },
  {
    key: 'has_nbi_clearance',
    label: 'NBI / Police Clearance',
    desc: 'Background verification for commercial facility access.',
    category: 'operational',
    isMandatory: true,
  },
  {
    key: 'has_resume',
    label: 'Curriculum Vitae / Bio-Data',
    desc: 'Employment history and technical certifications record.',
    category: 'standard',
    isMandatory: false,
  },
]

export interface EmployeeRecord {
  id: string
  full_name: string
  role: string
  employment_status?: string
  technician_level?: string
  base_salary?: number
  hire_date?: string
  contact_number?: string
  has_sss_id?: boolean
  has_philhealth_id?: boolean
  has_pagibig_id?: boolean
  has_medical_clearance?: boolean
  has_nbi_clearance?: boolean
  has_resume?: boolean
  employee_warnings?: any[]
  [key: string]: any
}

export default function EmployeeFilesClient() {
  const supabase = createClient()

  // State
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Filter Bar state (Unified onto activeTabFilter, removing redundant duplicate dropdowns)
  const [filterRole, setFilterRole] = useState('all')
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'incomplete' | 'warnings' | 'complete'>('all')

  // Pagination (clamped to 7 per page for viewport fit)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 7

  // Selected Employee (Master-Detail Inspector)
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRecord | null>(null)
  const [inspectorTab, setInspectorTab] = useState<'requirements' | 'warnings' | 'history'>('requirements')

  // Toast / notification feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Document upload state
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, Record<string, { fileName: string; fileUrl?: string; uploadedAt: string }>>>({})
  const [previewingDoc, setPreviewingDoc] = useState<{ title: string; fileName: string; fileUrl?: string } | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<{ label: string; key: string } | null>(null)

  // Warning Form state
  const [warningSubject, setWarningSubject] = useState('')
  const [warningDetails, setWarningDetails] = useState('')
  const [warningLevel, setWarningLevel] = useState('Standard Warning')
  const [isSubmittingWarning, setIsSubmittingWarning] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)

  // Settings / Edit Profile state
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editForm, setEditForm] = useState({
    employment_status: 'regular',
    technician_level: 'technician',
    base_salary: 0,
    contact_number: '',
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Fetch employees and warnings
  useEffect(() => {
    fetchEmployees()
  }, [])

  // Handle ESC key to close inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEmp) {
        setSelectedEmp(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEmp])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['technician', 'helper'])
        .order('full_name')

      if (profilesError) throw profilesError

      const { data: warningsData } = await supabase
        .from('employee_warnings')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesData) {
        const enriched = profilesData.map((profile) => ({
          ...profile,
          employee_warnings: (warningsData || []).filter((w) => w.employee_id === profile.id),
        }))
        setEmployees(enriched)

        // If an employee is currently selected, refresh their state
        if (selectedEmp) {
          const freshSelected = enriched.find((e) => e.id === selectedEmp.id)
          if (freshSelected) setSelectedEmp(freshSelected)
        }
      }
    } catch (err: any) {
      console.error('Failed to load employees:', err)
      setToastMessage({ text: err.message || 'Failed to load employee records', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Calculate compliance statistics for an employee
  const getComplianceStats = (emp: EmployeeRecord) => {
    const totalRequired = REQUIRED_DOCUMENTS.length
    let completed = 0
    const missingDocs: DocRequirement[] = []

    REQUIRED_DOCUMENTS.forEach((doc) => {
      const hasUploaded = Boolean(emp[doc.key] || uploadedFiles[emp.id]?.[doc.key])
      if (hasUploaded) {
        completed++
      } else {
        missingDocs.push(doc)
      }
    })

    const isComplete = completed === totalRequired
    const percentage = Math.round((completed / totalRequired) * 100)
    const hasWarnings = (emp.employee_warnings?.length || 0) > 0

    // Concise human-readable missing summary for table visibility
    const missingLabels = missingDocs.map((d) => {
      if (d.key === 'has_sss_id') return 'SSS ID'
      if (d.key === 'has_philhealth_id') return 'PhilHealth'
      if (d.key === 'has_pagibig_id') return 'Pag-IBIG'
      if (d.key === 'has_medical_clearance') return 'Medical Fit-to-Work'
      if (d.key === 'has_nbi_clearance') return 'NBI Clearance'
      if (d.key === 'has_resume') return 'Bio-Data'
      return d.label
    })

    let missingSummary = ''
    if (missingLabels.length === 1) {
      missingSummary = `Missing: ${missingLabels[0]}`
    } else if (missingLabels.length === 2) {
      missingSummary = `Missing: ${missingLabels[0]}, ${missingLabels[1]}`
    } else if (missingLabels.length > 2) {
      missingSummary = `Missing: ${missingLabels[0]}, ${missingLabels[1]} (+${missingLabels.length - 2} more)`
    }

    return {
      totalRequired,
      completed,
      missingDocs,
      missingLabels,
      missingSummary,
      isComplete,
      percentage,
      hasWarnings,
      warningsCount: emp.employee_warnings?.length || 0,
    }
  }

  // Summary Metrics for the 4 Top KPI Cards
  const kpiMetrics = useMemo(() => {
    const total = employees.length
    let incomplete = 0
    let withWarnings = 0
    let complete = 0

    employees.forEach((emp) => {
      const stats = getComplianceStats(emp)
      if (stats.isComplete) complete++
      else incomplete++

      if (stats.hasWarnings) withWarnings++
    })

    return { total, incomplete, withWarnings, complete }
  }, [employees, uploadedFiles])

  // Filtered employees list (Task-oriented: sorts incomplete records by highest missing count)
  const filteredEmployees = useMemo(() => {
    const list = employees.filter((emp) => {
      const stats = getComplianceStats(emp)
      const query = search.toLowerCase().trim()

      const matchSearch =
        !query ||
        emp.full_name?.toLowerCase().includes(query) ||
        emp.role?.toLowerCase().includes(query) ||
        emp.id?.toLowerCase().includes(query)

      const matchRole = filterRole === 'all' || emp.role === filterRole

      let matchTab = true
      if (activeTabFilter === 'incomplete') matchTab = !stats.isComplete
      if (activeTabFilter === 'complete') matchTab = stats.isComplete
      if (activeTabFilter === 'warnings') matchTab = stats.hasWarnings

      return matchSearch && matchRole && matchTab
    })

    // When triaging incomplete files, automatically bubble up the most deficient records
    if (activeTabFilter === 'incomplete') {
      return [...list].sort((a, b) => {
        const statsA = getComplianceStats(a)
        const statsB = getComplianceStats(b)
        return statsA.completed - statsB.completed
      })
    }

    return list
  }, [employees, search, filterRole, activeTabFilter, uploadedFiles])

  // Pagination calculation
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE) || 1
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredEmployees, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterRole, activeTabFilter])

  // Handle Document Upload
  const handleFileUpload = (doc: DocRequirement) => {
    if (!selectedEmp) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setUploadingDocKey(doc.key)
      const objectUrl = URL.createObjectURL(file)
      const uploadedAt = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      try {
        // Update database column
        const { error } = await supabase
          .from('profiles')
          .update({ [doc.key]: true })
          .eq('id', selectedEmp.id)

        if (error) throw error

        // Update local state
        setUploadedFiles((prev) => ({
          ...prev,
          [selectedEmp.id]: {
            ...(prev[selectedEmp.id] || {}),
            [doc.key]: {
              fileName: file.name,
              fileUrl: objectUrl,
              uploadedAt,
            },
          },
        }))

        // Update selected employee in-place
        setSelectedEmp((prev) => (prev ? { ...prev, [doc.key]: true } : null))
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === selectedEmp.id ? { ...emp, [doc.key]: true } : emp))
        )

        showToast(`"${file.name}" attached to ${selectedEmp.full_name}'s 201 file.`)

        // Audit log
        try {
          await logAdminActivity({
            adminName: 'Helena Vance',
            adminRole: 'HR Department',
            adminRoleKey: 'hr',
            moduleKey: 'hr_files',
            moduleName: '201 Files',
            action: 'Attached 201 Document',
            targetEntity: `${doc.label} (${selectedEmp.full_name})`,
          })
        } catch (e) {}
      } catch (err: any) {
        showToast(err.message || 'Failed to attach file', 'error')
      } finally {
        setUploadingDocKey(null)
      }
    }

    input.click()
  }

  // Remove Document
  const handleConfirmRemoveDoc = async () => {
    if (!selectedEmp || !deletingDoc) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [deletingDoc.key]: false })
        .eq('id', selectedEmp.id)

      if (error) throw error

      setUploadedFiles((prev) => {
        const empFiles = { ...(prev[selectedEmp.id] || {}) }
        delete empFiles[deletingDoc.key]
        return { ...prev, [selectedEmp.id]: empFiles }
      })

      setSelectedEmp((prev) => (prev ? { ...prev, [deletingDoc.key]: false } : null))
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === selectedEmp.id ? { ...emp, [deletingDoc.key]: false } : emp))
      )

      showToast(`Removed ${deletingDoc.label} from ${selectedEmp.full_name}'s file.`)
      setDeletingDoc(null)
    } catch (err: any) {
      showToast(err.message || 'Failed to remove document', 'error')
    }
  }

  // Request Missing Documents
  const handleRequestDocuments = async () => {
    if (!selectedEmp) return
    const stats = getComplianceStats(selectedEmp)
    if (stats.isComplete) {
      showToast('All documents are already completed for this employee.')
      return
    }

    try {
      const missingLabels = stats.missingDocs.map((d) => d.label).join(', ')

      // Record in notifications queue
      await supabase.from('push_notifications_queue').insert({
        user_id: selectedEmp.id,
        title: 'HR Document Request',
        body: `Please submit your missing 201 requirements: ${missingLabels}.`,
        notification_type: '201_compliance_reminder',
        status: 'pending',
      })

      // Record in activity logs
      await logAdminActivity({
        adminName: 'Helena Vance',
        adminRole: 'HR Department',
        adminRoleKey: 'hr',
        moduleKey: 'hr_files',
        moduleName: '201 Files',
        action: 'Dispatched Document Reminder',
        targetEntity: `${selectedEmp.full_name} (${stats.missingDocs.length} missing)`,
      })

      showToast(`Compliance reminder dispatched to ${selectedEmp.full_name}!`)
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch request', 'error')
    }
  }

  // Submit Disciplinary Warning
  const handleSubmitWarning = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmp || !warningSubject.trim() || !warningDetails.trim()) return

    try {
      setIsSubmittingWarning(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: newWarning, error } = await supabase
        .from('employee_warnings')
        .insert({
          employee_id: selectedEmp.id,
          issued_by: user?.id || selectedEmp.id,
          subject: warningSubject.trim(),
          details: warningDetails.trim(),
          warning_level: warningLevel,
          status: 'pending_service_review',
          incident_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) throw error

      showToast(`Warning recorded for ${selectedEmp.full_name}.`)
      setShowWarningModal(false)
      setWarningSubject('')
      setWarningDetails('')
      fetchEmployees()
    } catch (err: any) {
      showToast(err.message || 'Failed to record warning', 'error')
    } finally {
      setIsSubmittingWarning(false)
    }
  }

  // Save Employee Profile Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmp) return

    try {
      setIsSavingSettings(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          employment_status: editForm.employment_status,
          technician_level: editForm.technician_level,
          base_salary: Number(editForm.base_salary),
          contact_number: editForm.contact_number,
        })
        .eq('id', selectedEmp.id)

      if (error) throw error

      showToast(`Updated profile settings for ${selectedEmp.full_name}.`)
      setShowSettingsModal(false)
      fetchEmployees()
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error')
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Export Compliance Report CSV
  const handleExportReport = () => {
    try {
      const headers = [
        'Employee ID',
        'Full Name',
        'Role',
        'Status',
        '201 Compliance',
        'Completed Docs',
        'Missing Docs',
        'Active Warnings',
      ]

      const rows = employees.map((emp) => {
        const stats = getComplianceStats(emp)
        return [
          `EMP-${emp.id.slice(0, 5)}`,
          `"${emp.full_name}"`,
          emp.role || 'technician',
          emp.employment_status || 'regular',
          stats.isComplete ? 'Complete' : 'Incomplete',
          `${stats.completed}/${stats.totalRequired}`,
          `"${stats.missingDocs.map((d) => d.label).join(', ')}"`,
          stats.warningsCount,
        ]
      })

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `201_compliance_report_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast('201 Compliance Report exported successfully.')
    } catch (err: any) {
      showToast('Failed to export report', 'error')
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF9FB] dark:bg-[#121215] text-[#121215] dark:text-[#F4F4F6] overflow-hidden select-none transition-colors duration-200 relative">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#15271F] text-emerald-300 border-emerald-500/30'
              : 'bg-[#29171C] text-rose-300 border-rose-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 lg:p-7 gap-5">
        {/* Top Header Command Bar (Matching Image Header) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
              201 Files
            </h1>
            <p className="text-xs sm:text-sm text-[#575762] dark:text-[#B0B2BD]">
              Manage employee records, compliance documents, and disciplinary standing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="btn-export-report"
              type="button"
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* 1. Four Summary KPI Cards (Compact Minimalist Strip) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {/* Card 1: Total Workforce */}
          <button
            type="button"
            onClick={() => setActiveTabFilter('all')}
            className={`px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTabFilter === 'all'
                ? 'bg-blue-500/10 border-[#4D55CC] shadow-xs'
                : 'bg-[#F5F4F7] dark:bg-[#1E1F27] border-black/[0.08] dark:border-white/[0.08] hover:border-[#4D55CC]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#575762] dark:text-[#B0B2BD]">
                Field Personnel
              </span>
              <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#121215] dark:text-[#F4F4F6] tracking-tight leading-none">
                {kpiMetrics.total}
              </span>
              <span className="text-[10px] font-medium text-[#8E8D9A] dark:text-[#7A7C88]">
                in ledger
              </span>
            </div>
          </button>

          {/* Card 2: Incomplete 201 Files */}
          <button
            type="button"
            onClick={() => setActiveTabFilter('incomplete')}
            className={`px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTabFilter === 'incomplete'
                ? 'bg-rose-500/10 border-rose-500 shadow-xs'
                : 'bg-[#F5F4F7] dark:bg-[#1E1F27] border-black/[0.08] dark:border-white/[0.08] hover:border-rose-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                Incomplete Files
              </span>
              <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#121215] dark:text-[#F4F4F6] tracking-tight leading-none">
                {kpiMetrics.incomplete}
              </span>
              <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                action required
              </span>
            </div>
          </button>

          {/* Card 3: Active Warnings (Clarified as Disciplinary Overlay Condition) */}
          <button
            type="button"
            onClick={() => setActiveTabFilter('warnings')}
            className={`px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTabFilter === 'warnings'
                ? 'bg-amber-500/10 border-amber-500 shadow-xs'
                : 'bg-[#F5F4F7] dark:bg-[#1E1F27] border-black/[0.08] dark:border-white/[0.08] hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                Active Warnings
              </span>
              <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#121215] dark:text-[#F4F4F6] tracking-tight leading-none">
                {kpiMetrics.withWarnings}
              </span>
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                infractions overlay
              </span>
            </div>
          </button>

          {/* Card 4: Complete Files */}
          <button
            type="button"
            onClick={() => setActiveTabFilter('complete')}
            className={`px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTabFilter === 'complete'
                ? 'bg-emerald-500/10 border-emerald-500 shadow-xs'
                : 'bg-[#F5F4F7] dark:bg-[#1E1F27] border-black/[0.08] dark:border-white/[0.08] hover:border-emerald-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Verified Complete
              </span>
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#121215] dark:text-[#F4F4F6] tracking-tight leading-none">
                {kpiMetrics.complete}
              </span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                compliant
              </span>
            </div>
          </button>
        </div>

        {/* 2. Streamlined Filter Toolbar (Zero Duplication) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8D9A]" />
              <input
                id="search-employee-201"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, employee ID, or role..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.08] text-xs text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8E8D9A] hover:text-[#121215]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter Dropdown */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.08] text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] focus:outline-none cursor-pointer"
            >
              <option value="all">All Positions (Technicians & Helpers)</option>
              <option value="technician">HVAC Technicians</option>
              <option value="helper">Field Helpers</option>
            </select>

            {/* Clear Filters */}
            {(search || filterRole !== 'all' || activeTabFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setFilterRole('all')
                  setActiveTabFilter('all')
                }}
                className="text-xs font-semibold text-[#4D55CC] hover:underline px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Gestalt Filter Tabs Strip */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#EBEAEF] dark:bg-[#1E1F27] shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'all'
                  ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                  : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215]'
              }`}
            >
              All Employees
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('incomplete')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabFilter === 'incomplete'
                  ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-[#575762] dark:text-[#B0B2BD] hover:text-rose-600'
              }`}
            >
              <span>Incomplete Files</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/10 text-rose-600 font-extrabold">
                {kpiMetrics.incomplete}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('warnings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabFilter === 'warnings'
                  ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-[#575762] dark:text-[#B0B2BD] hover:text-amber-600'
              }`}
            >
              <span>Active Warnings</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-600 font-extrabold">
                {kpiMetrics.withWarnings}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('complete')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabFilter === 'complete'
                  ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-[#575762] dark:text-[#B0B2BD] hover:text-emerald-600'
              }`}
            >
              <span>Complete</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 font-extrabold">
                {kpiMetrics.complete}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Primary Table Workspace Area (Full Width, Crisp Minimalist Lines) */}
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#F5F4F7] dark:bg-[#1E1F27] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
          {/* Table Scroll Area */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[#EBEAEF] dark:bg-[#262732] border-b border-black/[0.08] dark:border-white/[0.08] text-[11px] font-bold text-[#575762] dark:text-[#B0B2BD] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="rounded border-black/20 text-[#4D55CC] focus:ring-0"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[180px]">Employee</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Position & Status</th>
                  <th className="py-3 px-4">201 Compliance</th>
                  <th className="py-3 px-4 min-w-[240px]">
                    Outstanding Requirements & Next Action
                  </th>
                  <th className="py-3 px-4 text-center">Warnings</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/[0.08] dark:divide-white/[0.08] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8E8D9A]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#4D55CC]" />
                        <span>Loading employee 201 records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8E8D9A]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderOpen className="w-8 h-8 text-[#8E8D9A]" />
                        <span className="font-bold">No employees found</span>
                        <span className="text-[11px]">Try adjusting your search query or filter tags.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp) => {
                    const stats = getComplianceStats(emp)
                    const isSelected = selectedEmp?.id === emp.id
                    const initials = emp.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'EM'

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => setSelectedEmp(emp)}
                        className={`cursor-pointer transition-colors border-b border-black/[0.08] dark:border-white/[0.08] ${
                          isSelected
                            ? 'bg-blue-500/10 dark:bg-blue-950/30'
                            : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${emp.full_name}`}
                            className="rounded border-black/20 text-[#4D55CC] focus:ring-0"
                          />
                        </td>

                        {/* Employee Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#EBEAEF] dark:bg-[#343640] text-[#121215] dark:text-[#F4F4F6] font-extrabold text-[11px] flex items-center justify-center shrink-0 border border-black/[0.08] dark:border-white/[0.1]">
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[#121215] dark:text-[#F4F4F6] truncate">
                                {emp.full_name}
                              </span>
                              <span className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88]">
                                EMP-{emp.id.slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Consolidated Position & Status */}
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#121215] dark:text-[#F4F4F6] capitalize">
                              {emp.role === 'technician' ? 'HVAC Technician' : 'Field Helper'}
                            </span>
                            <span className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] capitalize">
                              {emp.technician_level || 'Field Staff'} · {emp.employment_status || 'Regular'}
                            </span>
                          </div>
                        </td>

                        {/* 201 File Status */}
                        <td className="py-3 px-4">
                          {stats.isComplete ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Complete ({stats.completed}/{stats.totalRequired})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Incomplete ({stats.completed}/{stats.totalRequired})</span>
                            </span>
                          )}
                        </td>

                        {/* Outstanding Requirements & Next Action (The Core Improvement!) */}
                        <td className="py-3 px-4">
                          {stats.isComplete ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>All statutory requirements verified</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 truncate">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{stats.missingSummary}</span>
                              </div>
                              <span className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] font-medium">
                                Action: Collect {stats.missingDocs.length} missing document{stats.missingDocs.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Warnings */}
                        <td className="py-3 px-4 text-center">
                          {stats.warningsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{stats.warningsCount}</span>
                            </span>
                          ) : (
                            <span className="text-[#8E8D9A] font-medium text-xs">0</span>
                          )}
                        </td>

                        {/* Action Button (Single primary action: View file) */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedEmp(emp)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#4D55CC] dark:text-indigo-400 border border-black/[0.08] dark:border-white/[0.1] hover:bg-[#4D55CC] hover:text-white dark:hover:bg-[#4D55CC] dark:hover:text-white transition-all shadow-2xs cursor-pointer"
                            >
                              View file
                            </button>

                            <button
                              type="button"
                              title="Actions"
                              onClick={() => {
                                setSelectedEmp(emp)
                                setShowSettingsModal(true)
                                setEditForm({
                                  employment_status: emp.employment_status || 'regular',
                                  technician_level: emp.technician_level || 'technician',
                                  base_salary: emp.base_salary || 0,
                                  contact_number: emp.contact_number || '',
                                })
                              }}
                              className="p-1.5 rounded-lg text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Strip */}
          <div className="px-4 py-3 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#1E1F27] flex items-center justify-between text-xs text-[#8E8D9A] shrink-0">
            <span>
              Showing {paginatedEmployees.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length} employees
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.04] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pNum = idx + 1
                if (totalPages > 6 && Math.abs(pNum - currentPage) > 2 && pNum !== 1 && pNum !== totalPages) {
                  if (pNum === 2 || pNum === totalPages - 1) {
                    return (
                      <span key={pNum} className="px-1 text-[10px]">
                        ...
                      </span>
                    )
                  }
                  return null
                }

                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pNum
                        ? 'bg-[#4D55CC] text-[#FAF9FB]'
                        : 'hover:bg-black/[0.04] text-[#575762] dark:text-[#B0B2BD]'
                    }`}
                  >
                    {pNum}
                  </button>
                )
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.04] disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Slide-Over Inspector Drawer & Backdrop (Spacious 620px Drawer, Zero Table Squeeze) */}
      {selectedEmp && (
        <>
          {/* Subtle Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] z-40 transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedEmp(null)}
            aria-hidden="true"
          />

          {/* Floating Slide-Over Sheet (620px width with high aesthetic finish) */}
          <aside
            aria-label="Employee 201 Inspector"
            className="fixed top-3 sm:top-4 bottom-3 sm:bottom-4 right-3 sm:right-4 w-[560px] md:w-[620px] max-w-[calc(100vw-32px)] z-50 bg-[#FAF9FB] dark:bg-[#1E1F27] rounded-[24px] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-6 duration-200"
          >
            {/* Inspector Header */}
            <div className="p-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-[#F5F4F7] dark:bg-[#22232A]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-[#4D55CC] dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-500/20">
                  {selectedEmp.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'EM'}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-extrabold text-sm text-[#121215] dark:text-[#F4F4F6] truncate">
                    {selectedEmp.full_name}
                  </h3>
                  <span className="text-[11px] text-[#8E8D9A] dark:text-[#7A7C88] truncate capitalize">
                    EMP-{selectedEmp.id.slice(0, 5)} · {selectedEmp.role === 'technician' ? 'HVAC Technician' : 'Field Helper'} · {selectedEmp.employment_status || 'Regular'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmp(null)}
                className="p-1.5 rounded-xl text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                title="Close inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Sub-Tabs (201 Requirements, Warnings, History) */}
            <div className="px-4 pt-2.5 flex items-center gap-4 border-b border-black/[0.08] dark:border-white/[0.08] shrink-0 bg-[#FAF9FB] dark:bg-[#1E1F27]">
              <button
                type="button"
                onClick={() => setInspectorTab('requirements')}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  inspectorTab === 'requirements'
                    ? 'text-[#4D55CC] dark:text-indigo-400'
                    : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215]'
                }`}
              >
                <span>201 Requirements</span>
                {inspectorTab === 'requirements' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4D55CC] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('warnings')}
                className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                  inspectorTab === 'warnings'
                    ? 'text-[#4D55CC] dark:text-indigo-400'
                    : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215]'
                }`}
              >
                <span>Warnings</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/15 text-amber-600 font-extrabold">
                  {selectedEmp.employee_warnings?.length || 0}
                </span>
                {inspectorTab === 'warnings' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4D55CC] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('history')}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  inspectorTab === 'history'
                    ? 'text-[#4D55CC] dark:text-indigo-400'
                    : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215]'
                }`}
              >
                <span>History</span>
                {inspectorTab === 'history' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4D55CC] rounded-full" />
                )}
              </button>
            </div>

            {/* Inspector Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB 1: 201 Requirements */}
              {inspectorTab === 'requirements' && (
                <>
                  {/* Attention Banner (If incomplete) */}
                  {getComplianceStats(selectedEmp).missingDocs.length > 0 ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold">
                          {getComplianceStats(selectedEmp).missingDocs.length} items need attention
                        </span>
                        <span className="text-[11px] text-rose-600/90 dark:text-rose-300/90">
                          Please complete the missing statutory documents below.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-extrabold">201 File is Complete & Verified</span>
                        <span className="text-[11px] text-emerald-600/90 dark:text-emerald-300/90">
                          All statutory and health requirements are up to date.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#121215] dark:text-[#F4F4F6]">Required Documents</span>
                      <span className="text-[#575762] dark:text-[#B0B2BD] font-mono">
                        {getComplianceStats(selectedEmp).completed} of {REQUIRED_DOCUMENTS.length} completed
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full bg-[#4D55CC] rounded-full transition-all duration-300"
                        style={{ width: `${getComplianceStats(selectedEmp).percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Document List */}
                  <div className="space-y-2 pt-1">
                    {REQUIRED_DOCUMENTS.map((doc) => {
                      const isUploaded = Boolean(
                        selectedEmp[doc.key] || uploadedFiles[selectedEmp.id]?.[doc.key]
                      )
                      const isUploading = uploadingDocKey === doc.key
                      const uploadedInfo = uploadedFiles[selectedEmp.id]?.[doc.key]

                      return (
                        <div
                          key={doc.key}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isUploaded
                              ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                              : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                isUploaded
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isUploaded ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                                  {doc.label}
                                </span>
                                {doc.isMandatory && !isUploaded && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                    Mandatory
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#8E8D9A] dark:text-[#7A7C88] truncate">
                                {isUploaded
                                  ? `Uploaded · ${uploadedInfo?.uploadedAt || 'Verified'}`
                                  : 'Missing · Required for compliance'}
                              </span>
                            </div>
                          </div>

                          {/* Row Action (Explicit labeled actions, eliminating mystery icons) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUploaded ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewingDoc({
                                      title: doc.label,
                                      fileName: uploadedInfo?.fileName || `${doc.label}.pdf`,
                                      fileUrl: uploadedInfo?.fileUrl,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#4D55CC] dark:text-indigo-400 hover:bg-[#4D55CC] hover:text-white border border-black/[0.08] dark:border-white/[0.1] transition-colors shadow-2xs cursor-pointer"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFileUpload(doc)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#575762] dark:text-[#B0B2BD] hover:text-[#4D55CC] dark:hover:text-indigo-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border border-transparent hover:border-black/[0.06] transition-colors cursor-pointer"
                                >
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingDoc({ label: doc.label, key: doc.key })}
                                  title="Detach document"
                                  className="p-1.5 rounded-lg text-[#8E8D9A] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => handleFileUpload(doc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                              >
                                {isUploading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <UploadCloud className="w-3.5 h-3.5" />
                                )}
                                <span>+ Upload</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Active Warnings Snippet in Inspector */}
                  {selectedEmp.employee_warnings && selectedEmp.employee_warnings.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Active Warnings ({selectedEmp.employee_warnings.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setInspectorTab('warnings')}
                          className="text-[11px] text-[#4D55CC] hover:underline cursor-pointer"
                        >
                          View all
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {selectedEmp.employee_warnings.slice(0, 2).map((w) => (
                          <div
                            key={w.id}
                            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                                {w.subject}
                              </span>
                              <span className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88]">
                                {w.incident_date || 'Recent'}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#575762] dark:text-[#B0B2BD] line-clamp-2">
                              {w.details}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: Warnings Management */}
              {inspectorTab === 'warnings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                      Disciplinary Record
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWarningModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4D55CC] text-white hover:bg-[#4338CA] transition-colors cursor-pointer"
                    >
                      + Issue Disciplinary Notice
                    </button>
                  </div>

                  {selectedEmp.employee_warnings?.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#8E8D9A]">
                      <UserCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <span className="font-bold">Clean Disciplinary Standing</span>
                      <p className="text-[11px] mt-0.5">No active warnings or infractions on file.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEmp.employee_warnings?.map((w) => (
                        <div
                          key={w.id}
                          className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] text-xs flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">{w.subject}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 font-extrabold uppercase">
                              {w.warning_level}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#575762] dark:text-[#B0B2BD]">{w.details}</p>
                          <span className="text-[10px] text-[#8E8D9A] font-mono">
                            Date of Incident: {w.incident_date}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: History Timeline */}
              {inspectorTab === 'history' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                    201 Compliance Audit Trail
                  </span>

                  <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-black/[0.06] dark:before:bg-white/[0.08]">
                    <div className="relative flex flex-col gap-1 text-xs">
                      <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-[#4D55CC] border-2 border-[#FAF9FB] dark:border-[#1E1F27]" />
                      <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">
                        File Created & Onboarded
                      </span>
                      <span className="text-[11px] text-[#8E8D9A]">
                        Initial employment record registered.
                      </span>
                    </div>

                    {selectedEmp.employment_status && (
                      <div className="relative flex flex-col gap-1 text-xs">
                        <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#FAF9FB] dark:border-[#1E1F27]" />
                        <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">
                          Status: {selectedEmp.employment_status.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-[#8E8D9A]">
                          Base salary set to ₱{selectedEmp.base_salary?.toLocaleString() || '0'}/mo.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer (Context-Adaptive per Active Tab) */}
            {inspectorTab === 'requirements' && (() => {
              const stats = getComplianceStats(selectedEmp)
              const missingCount = stats.missingDocs.length

              return (
                <div className="p-4 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#1E1F27] flex flex-col gap-2 shrink-0">
                  {missingCount > 0 ? (
                    <button
                      id="btn-request-documents"
                      type="button"
                      onClick={handleRequestDocuments}
                      className="w-full py-2.5 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Compliance Notice ({missingCount} Missing)</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>All statutory requirements verified</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => alert(`Exporting 201 compliance dossier for ${selectedEmp.full_name}...`)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        Export Dossier
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </aside>
        </>
      )}

      {/* Preview Document Modal */}
      {previewingDoc && (
        <ModalDialog
          isOpen={Boolean(previewingDoc)}
          onClose={() => setPreviewingDoc(null)}
          title={`Document: ${previewingDoc.title}`}
          subtitle={`Verified attachment: ${previewingDoc.fileName}`}
          maxWidth="md"
        >
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-[#4D55CC] flex items-center justify-center mx-auto">
              <FileCheck className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[#121215] dark:text-[#F4F4F6]">
                {previewingDoc.fileName}
              </span>
              <span className="text-xs text-[#8E8D9A]">
                Digital compliance document securely verified in TechnoCycle 201 Vault.
              </span>
            </div>

            {previewingDoc.fileUrl && (
              <button
                type="button"
                onClick={() => window.open(previewingDoc.fileUrl, '_blank')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4D55CC] text-white text-xs font-bold shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Window</span>
              </button>
            )}
          </div>
        </ModalDialog>
      )}

      {/* Remove Document Confirmation Modal */}
      {deletingDoc && (
        <ModalDialog
          isOpen={Boolean(deletingDoc)}
          onClose={() => setDeletingDoc(null)}
          title="Remove 201 Document"
          subtitle={`Are you sure you want to detach ${deletingDoc.label}?`}
          maxWidth="sm"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-[#575762] dark:text-[#B0B2BD]">
              This will mark the requirement as incomplete in the compliance ledger until a new file is uploaded.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#575762] hover:bg-black/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveDoc}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Remove Document
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Issue Warning Modal */}
      {showWarningModal && selectedEmp && (
        <ModalDialog
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          title="Issue Disciplinary Notice"
          subtitle={`Record a formal notice on ${selectedEmp.full_name}'s official compliance dossier (Labor Code Art. 297).`}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitWarning} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                Notice Level
              </label>
              <select
                value={warningLevel}
                onChange={(e) => setWarningLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs font-semibold text-[#121215] dark:text-[#F4F4F6]"
              >
                <option value="Verbal Reprimand">Verbal Reprimand (Informal Documented)</option>
                <option value="Standard Warning">Notice of Violation (First Written Warning)</option>
                <option value="Final Warning">Notice to Explain / Final Warning (Due Process)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                Subject / Infraction Title
              </label>
              <input
                type="text"
                required
                value={warningSubject}
                onChange={(e) => setWarningSubject(e.target.value)}
                placeholder="e.g. Unexcused Tardiness / Missing Mandatory ID"
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                Factual Narrative & Evidence Details
              </label>
              <textarea
                required
                rows={3}
                value={warningDetails}
                onChange={(e) => setWarningDetails(e.target.value)}
                placeholder="Detail the circumstances, policy violated, and agreed corrective action..."
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#575762]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingWarning}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmittingWarning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Issue Notice</span>
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* Edit Profile Settings Modal */}
      {showSettingsModal && selectedEmp && (
        <ModalDialog
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title={`Employee Settings: ${selectedEmp.full_name}`}
          subtitle="Update employment tier, base compensation, and operational details."
          maxWidth="md"
        >
          <form onSubmit={handleSaveSettings} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                  Employment Status
                </label>
                <select
                  value={editForm.employment_status}
                  onChange={(e) => setEditForm({ ...editForm, employment_status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs font-semibold text-[#121215] dark:text-[#F4F4F6]"
                >
                  <option value="regular">Regular</option>
                  <option value="probationary">Probationary</option>
                  <option value="contractual">Contractual</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                  Technician Level
                </label>
                <select
                  value={editForm.technician_level}
                  onChange={(e) => setEditForm({ ...editForm, technician_level: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs font-semibold text-[#121215] dark:text-[#F4F4F6]"
                >
                  <option value="helper">Field Helper</option>
                  <option value="technician">HVAC Technician</option>
                  <option value="senior">Senior Field Lead</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                  Base Monthly Salary (₱)
                </label>
                <input
                  type="number"
                  value={editForm.base_salary}
                  onChange={(e) => setEditForm({ ...editForm, base_salary: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.contact_number}
                  onChange={(e) => setEditForm({ ...editForm, contact_number: e.target.value })}
                  placeholder="0917-000-0000"
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#575762]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4D55CC] hover:bg-[#4338CA] text-white flex items-center gap-1.5"
              >
                {isSavingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  )
}
