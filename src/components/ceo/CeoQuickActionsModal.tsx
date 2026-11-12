'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Command,
  Search,
  KeyRound,
  History,
  Megaphone,
  ShieldCheck,
  Home,
  Wrench,
  Calculator,
  Users,
  Sun,
  Moon,
  ArrowRight,
  Keyboard,
  X,
  AlertTriangle,
  Check,
  CornerDownLeft,
  Sparkles
} from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'

// ---------------------------------------------------------------------------
// Action Item Definition
// ---------------------------------------------------------------------------
export interface QuickActionItem {
  id: string
  title: string
  description: string
  icon: any
  category: 'primary' | 'navigation' | 'settings'
  keywords: string[]
  shortcutHint?: string
  perform: () => void
}

export function CeoQuickActionsModal() {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [isOpen, setIsOpen] = useState(false)
  const [showCheatSheet, setShowCheatSheet] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // Load User Shortcut Preferences (WCAG 2.2 2.1.4 Compliance)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem('technocycle_shortcuts_enabled')
      if (stored !== null) {
        setShortcutsEnabled(stored !== 'false')
      }
    } catch (e) {}
  }, [])

  const handleToggleShortcuts = (enabled: boolean) => {
    setShortcutsEnabled(enabled)
    try {
      localStorage.setItem('technocycle_shortcuts_enabled', enabled ? 'true' : 'false')
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleGiveAccess = () => {
    setIsOpen(false)
    if (pathname === '/ceo') {
      window.dispatchEvent(new CustomEvent('open-give-access-modal'))
    } else {
      router.push('/ceo?action=give_access')
    }
  }

  const handleOpenActivityHistory = () => {
    setIsOpen(false)
    router.push('/ceo/activities')
  }

  const handleCreateAnnouncement = () => {
    setIsOpen(false)
    if (pathname === '/ceo/announcements') {
      window.dispatchEvent(new CustomEvent('open-create-announcement'))
    } else {
      router.push('/ceo/announcements?action=create')
    }
  }

  const handleReviewActiveAccess = () => {
    setIsOpen(false)
    router.push('/ceo/activities?tab=temporary_access')
  }

  const handleOpenOverview = () => {
    setIsOpen(false)
    router.push('/ceo')
  }

  // ---------------------------------------------------------------------------
  // Catalog of Quick Actions
  // ---------------------------------------------------------------------------
  const allActions: QuickActionItem[] = useMemo(() => [
    {
      id: 'give_access',
      title: 'Give Temporary Access',
      description: 'Start a new access assignment.',
      icon: KeyRound,
      category: 'primary',
      keywords: ['give', 'temporary', 'access', 'delegate', 'permission', 'override', 'assign', 'maria', 'carlos'],
      shortcutHint: 'Alt+G',
      perform: handleGiveAccess
    },
    {
      id: 'activity_history',
      title: 'Open Activity History',
      description: 'Review past access and changes.',
      icon: History,
      category: 'primary',
      keywords: ['history', 'activity', 'audit', 'logs', 'past', 'events', 'ledger'],
      shortcutHint: 'Alt+2',
      perform: handleOpenActivityHistory
    },
    {
      id: 'create_announcement',
      title: 'Create Announcement',
      description: 'Start writing a company update.',
      icon: Megaphone,
      category: 'primary',
      keywords: ['announcement', 'create', 'broadcast', 'post', 'update', 'notice', 'publish'],
      shortcutHint: 'Alt+N',
      perform: handleCreateAnnouncement
    },
    {
      id: 'review_active_access',
      title: 'Review Active Access',
      description: 'See temporary permissions that are still active.',
      icon: ShieldCheck,
      category: 'primary',
      keywords: ['active', 'review', 'coverage', 'temporary', 'current', 'permissions', 'who has access'],
      perform: handleReviewActiveAccess
    },
    {
      id: 'open_overview',
      title: 'Dashboard Overview',
      description: 'Return to primary executive operations hub.',
      icon: Home,
      category: 'navigation',
      keywords: ['overview', 'dashboard', 'hub', 'home', 'main'],
      shortcutHint: 'Alt+1',
      perform: handleOpenOverview
    },
    {
      id: 'dept_accounting',
      title: 'Accounting Department',
      description: 'Review finance, invoices, and payroll logs.',
      icon: Calculator,
      category: 'navigation',
      keywords: ['accounting', 'finance', 'payroll', 'billing', 'invoices', 'accountant'],
      perform: () => {
        setIsOpen(false)
        router.push('/ceo')
      }
    },
    {
      id: 'dept_service',
      title: 'Service & Field Operations',
      description: 'Inspect dispatch stations and vehicle GPS tracking.',
      icon: Wrench,
      category: 'navigation',
      keywords: ['service', 'field', 'operations', 'dispatch', 'gps', 'fleet', 'technicians'],
      perform: () => {
        setIsOpen(false)
        router.push('/ceo')
      }
    },
    {
      id: 'dept_hr',
      title: 'Human Resources',
      description: 'Review employee 201 records and staff compliance.',
      icon: Users,
      category: 'navigation',
      keywords: ['hr', 'human resources', 'staff', '201', 'personnel', 'compliance', 'absent'],
      perform: () => {
        setIsOpen(false)
        router.push('/ceo')
      }
    },
    {
      id: 'toggle_theme',
      title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle executive workspace color theme.',
      icon: isDark ? Sun : Moon,
      category: 'settings',
      keywords: ['theme', 'dark', 'light', 'mode', 'color', 'appearance'],
      shortcutHint: 'Alt+T',
      perform: () => {
        toggleTheme()
        setIsOpen(false)
      }
    }
  ], [pathname, isDark, toggleTheme])

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) {
      return allActions.filter(a => a.category === 'primary')
    }
    const q = searchQuery.toLowerCase().trim()
    return allActions.filter(action => {
      const matchTitle = action.title.toLowerCase().includes(q)
      const matchDesc = action.description.toLowerCase().includes(q)
      const matchKeywords = action.keywords.some(k => k.toLowerCase().includes(q))
      return matchTitle || matchDesc || matchKeywords
    })
  }, [allActions, searchQuery])

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredActions.length, searchQuery])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]') as HTMLElement | null
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // ---------------------------------------------------------------------------
  // Global Keyboard Event Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Allow custom event listener to open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
        return
      }

      // Check if global shortcuts are disabled by user
      if (!shortcutsEnabled) return

      // Handle Palette Navigation when open
      if (isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setIsOpen(false)
          setShowCheatSheet(false)
          return
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredActions.length))
          return
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + Math.max(1, filteredActions.length)) % Math.max(1, filteredActions.length))
          return
        }

        if (e.key === 'Enter') {
          e.preventDefault()
          if (filteredActions[selectedIndex]) {
            filteredActions[selectedIndex].perform()
          }
          return
        }

        return
      }

      // If typing in an input elsewhere, do not trigger single-key or Alt shortcuts
      const activeTag = document.activeElement?.tagName
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable

      if (isInputFocused) return

      // Global Safe Navigation Shortcuts (Modifier-based: Alt+key)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case '1':
          case 'h':
            e.preventDefault()
            router.push('/ceo')
            break
          case '2':
          case 'l':
            e.preventDefault()
            router.push('/ceo/activities')
            break
          case '3':
          case 'a':
            e.preventDefault()
            router.push('/ceo/announcements')
            break
          case 'g':
            e.preventDefault()
            handleGiveAccess()
            break
          case 'n':
            e.preventDefault()
            handleCreateAnnouncement()
            break
          case 't':
            e.preventDefault()
            toggleTheme()
            break
          default:
            break
        }
        return
      }

      // Help Shortcut: "?" opens Cheat Sheet
      if (e.key === '?' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowCheatSheet(prev => !prev)
      }
    }

    const handleCustomOpen = () => setIsOpen(true)
    const handleCustomCheatSheet = () => setShowCheatSheet(true)

    window.addEventListener('keydown', handleGlobalKeyDown)
    window.addEventListener('open-quick-actions', handleCustomOpen)
    window.addEventListener('open-shortcuts-cheatsheet', handleCustomCheatSheet)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      window.removeEventListener('open-quick-actions', handleCustomOpen)
      window.removeEventListener('open-shortcuts-cheatsheet', handleCustomCheatSheet)
    }
  }, [isOpen, filteredActions, selectedIndex, shortcutsEnabled, router, toggleTheme])

  return (
    <>
      {/* =======================================================================
          MAIN QUICK ACTIONS MODAL (Matches user reference mockup)
      ======================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick Actions"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-start justify-center p-4 pt-16 md:pt-24 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[#FAF9FB] dark:bg-[#22232A] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden text-zinc-900 dark:text-zinc-100 flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header Section */}
            <div className="p-5 pb-4 flex items-start justify-between gap-4 border-b border-black/[0.05] dark:border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Command className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
                    Quick Actions
                  </h2>
                  <p className="text-xs text-[#7A7C88] dark:text-[#9A9BA6] font-medium mt-0.5">
                    Find a feature or perform a common task.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/[0.04] dark:bg-white/[0.06] text-[#7A7C88] dark:text-[#9A9BA6] border border-black/[0.05] dark:border-white/[0.08]">
                  Concept
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Embedded Search Well */}
            <div className="p-4 pb-2">
              <div className="relative flex items-center bg-[#EBEAEF] dark:bg-[#1A1B20] rounded-xl border border-black/[0.06] dark:border-white/[0.08] px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#4D55CC] focus-within:border-transparent transition-all">
                <Search className="w-4 h-4 text-[#8E8D9A] dark:text-[#7A7C88] shrink-0 mr-2.5" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search actions, employees, departments..."
                  className="w-full bg-transparent text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-[#8E8D9A] dark:placeholder-[#7A7C88] focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#8E8D9A] hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-[#8E8D9A] dark:text-[#7A7C88] bg-[#FAF9FB] dark:bg-[#2B2C35] px-2 py-0.5 rounded-md border border-black/[0.06] dark:border-white/[0.08] shrink-0">
                    Esc to close
                  </span>
                )}
              </div>
            </div>

            {/* 3. Section Title */}
            <div className="px-5 pt-3 pb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#8E8D9A] dark:text-[#7A7C88]">
              <span>{searchQuery.trim() ? 'Matching Results' : 'Quick Actions'}</span>
              <span className="text-[10px] font-medium lowercase">Use &uarr;&darr; keys to navigate</span>
            </div>

            {/* 4. Action List Items */}
            <div
              ref={listRef}
              className="px-3 py-1 space-y-1 max-h-[340px] overflow-y-auto [scrollbar-gutter:stable]"
            >
              {filteredActions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7A7C88] dark:text-[#9A9BA6]">
                  <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">No matching actions found</p>
                  <p className="text-[11px] mt-1">Try searching for &quot;access&quot;, &quot;announcement&quot;, or &quot;accounting&quot;.</p>
                </div>
              ) : (
                filteredActions.map((action, index) => {
                  const Icon = action.icon
                  const isSelected = index === selectedIndex

                  return (
                    <button
                      key={action.id}
                      type="button"
                      data-active={isSelected}
                      onClick={() => action.perform()}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left cursor-pointer group ${
                        isSelected
                          ? 'bg-[#E4E4EA] dark:bg-[#343640] border border-black/[0.08] dark:border-white/[0.12] shadow-2xs'
                          : 'bg-transparent hover:bg-[#EBEAEF] dark:hover:bg-[#2B2C35] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#4D55CC] text-white shadow-xs'
                              : 'bg-[#EBEAEF] dark:bg-[#343640] text-[#4D55CC] dark:text-indigo-400'
                          }`}
                        >
                          <Icon className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs text-[#121215] dark:text-[#F4F4F6] truncate flex items-center gap-2">
                            <span>{action.title}</span>
                            {action.shortcutHint && (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-black/[0.05] dark:bg-white/[0.08] text-[#7A7C88] dark:text-[#9A9BA6]">
                                {action.shortcutHint}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#7A7C88] dark:text-[#9A9BA6] font-medium truncate mt-0.5">
                            {action.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-3">
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#4D55CC] dark:text-indigo-400">
                            <span>Select</span>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-[#8E8D9A] dark:text-[#7A7C88] group-hover:translate-x-0.5 transition-transform" />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* 5. Footer Strip */}
            <div className="p-3.5 px-5 bg-[#EBEAEF] dark:bg-[#1A1B20] border-t border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2 text-[#7A7C88] dark:text-[#9A9BA6]">
                <Keyboard className="w-4 h-4 text-[#8E8D9A] dark:text-[#7A7C88]" />
                <span className="text-[11px]">Keyboard shortcuts</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setShowCheatSheet(true)
                }}
                className="text-xs font-bold text-[#4D55CC] dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                View shortcuts
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          KEYBOARD SHORTCUTS CHEAT SHEET & ACCESSIBILITY MODAL
      ======================================================================= */}
      {showCheatSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard Shortcuts & Accessibility"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[160] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowCheatSheet(false)}
        >
          <div
            className="w-full max-w-lg bg-[#FAF9FB] dark:bg-[#22232A] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden text-zinc-900 dark:text-zinc-100 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-black/[0.05] dark:border-white/[0.07] flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4D55CC] dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Keyboard className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                    Keyboard Shortcuts Reference
                  </h3>
                  <p className="text-xs text-[#7A7C88] dark:text-[#9A9BA6] font-medium mt-0.5">
                    Navigate TechnoCycle rapidly with non-conflicting modifier keys.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCheatSheet(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shortcuts Content */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto text-xs">
              {/* WCAG 2.2 Criterion 2.1.4 Master Switch */}
              <div className="p-4 rounded-xl bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-4">
                <div>
                  <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Enable Global Shortcuts</span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      WCAG 2.2 Compliant
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A7C88] dark:text-[#9A9BA6] mt-0.5 font-medium">
                    Turn off custom shortcuts if using speech dictation or custom screen readers.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={shortcutsEnabled}
                    onChange={(e) => handleToggleShortcuts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4D55CC]"></div>
                </label>
              </div>

              {/* Shortcut Groups */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8E8D9A] dark:text-[#7A7C88]">
                  Global Commands & Navigation
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Open Quick Actions Palette</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#4D55CC] dark:text-indigo-400">
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">Ctrl</kbd>
                      <span>+</span>
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">K</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Give Temporary Access</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#4D55CC] dark:text-indigo-400">
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">Alt</kbd>
                      <span>+</span>
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">G</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Create New Announcement</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#4D55CC] dark:text-indigo-400">
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">Alt</kbd>
                      <span>+</span>
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">N</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Jump to Overview Hub</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#4D55CC] dark:text-indigo-400">
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">Alt</kbd>
                      <span>+</span>
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">1</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Jump to Access History Ledger</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#4D55CC] dark:text-indigo-400">
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">Alt</kbd>
                      <span>+</span>
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">2</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Jump to Announcements</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#4D55CC] dark:text-indigo-400">
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">Alt</kbd>
                      <span>+</span>
                      <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1]">3</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06]">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Close Open Modal / Dialog</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#EBEAEF] dark:bg-[#1A1B20] border border-black/[0.08] dark:border-white/[0.1] font-mono text-[11px] font-bold text-[#4D55CC] dark:text-indigo-400">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Safety Guardrail Notice */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Security Rule:</strong> Keyboard shortcuts only navigate or open forms. Critical actions like activating temporary overrides or broadcasting announcements always mandate an explicit review confirmation.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#EBEAEF] dark:bg-[#1A1B20] border-t border-black/[0.05] dark:border-white/[0.07] flex justify-end">
              <button
                type="button"
                onClick={() => setShowCheatSheet(false)}
                className="px-5 py-2 bg-[#4D55CC] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
