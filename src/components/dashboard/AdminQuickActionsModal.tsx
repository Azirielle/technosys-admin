'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Command,
  Search,
  KeyRound,
  FileSpreadsheet,
  Megaphone,
  Home,
  Sun,
  Moon,
  ArrowRight,
  Keyboard,
  X,
  AlertTriangle,
  Check,
  CornerDownLeft,
  Calendar,
  MessageSquare,
  FolderOpen,
  ScrollText,
  MapPin,
  Box,
  LogOut,
  Users,
} from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'

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

interface AdminQuickActionsModalProps {
  role: 'ceo' | 'hr' | 'coordinator' | 'accountant'
}

export function AdminQuickActionsModal({ role }: AdminQuickActionsModalProps) {
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

  // Load User Shortcut Preferences (WCAG 2.2 2.1.4 Compliance)
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

  // Global event listener for opening from dock button or custom events
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true)
      setSearchQuery('')
      setSelectedIndex(0)
    }
    window.addEventListener('open-quick-actions', handleOpen)
    return () => window.removeEventListener('open-quick-actions', handleOpen)
  }, [])

  // Global Keyboard Listener (Ctrl+K, Esc, Arrow Keys, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        setSearchQuery('')
        setSelectedIndex(0)
        return
      }

      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        setShowCheatSheet(false)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < filteredActions.length ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredActions.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].perform()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Build role-specific actions list
  const actions: QuickActionItem[] = useMemo(() => {
    const list: QuickActionItem[] = []

    if (role === 'ceo') {
      list.push(
        {
          id: 'ceo-give-access',
          title: 'Give Temporary Access',
          description: 'Delegate module permissions to a department head.',
          icon: KeyRound,
          category: 'primary',
          keywords: ['access', 'permission', 'override', 'grant', 'temporary', 'module'],
          shortcutHint: 'G',
          perform: () => {
            setIsOpen(false)
            if (pathname === '/ceo') {
              window.dispatchEvent(new CustomEvent('open-give-access-modal'))
            } else {
              router.push('/ceo?action=give_access')
            }
          },
        },
        {
          id: 'ceo-activity-history',
          title: 'Open Activity History',
          description: 'Review security audit trail and recent overrides.',
          icon: FileSpreadsheet,
          category: 'primary',
          keywords: ['history', 'logs', 'audit', 'activities', 'trail'],
          shortcutHint: 'H',
          perform: () => {
            setIsOpen(false)
            router.push('/ceo/activities')
          },
        },
        {
          id: 'ceo-create-announcement',
          title: 'Create Announcement',
          description: 'Draft and publish a company-wide update.',
          icon: Megaphone,
          category: 'primary',
          keywords: ['announcement', 'broadcast', 'post', 'notify', 'create'],
          shortcutHint: 'A',
          perform: () => {
            setIsOpen(false)
            if (pathname === '/ceo/announcements') {
              window.dispatchEvent(new CustomEvent('open-create-announcement'))
            } else {
              router.push('/ceo/announcements?action=create')
            }
          },
        },
        {
          id: 'ceo-nav-overview',
          title: 'Go to Executive Overview',
          description: 'Open the main system override command hub.',
          icon: Home,
          category: 'navigation',
          keywords: ['overview', 'hub', 'dashboard', 'home', 'overrides'],
          perform: () => {
            setIsOpen(false)
            router.push('/ceo')
          },
        }
      )
    } else if (role === 'hr') {
      list.push(
        {
          id: 'hr-leaves',
          title: 'Review Leave Requests',
          description: 'Evaluate pending employee leaves and vacation filings.',
          icon: Calendar,
          category: 'primary',
          keywords: ['leaves', 'vacation', 'sick', 'time off', 'approval', 'pending'],
          shortcutHint: 'L',
          perform: () => {
            setIsOpen(false)
            router.push('/hr/leaves')
          },
        },
        {
          id: 'hr-tickets',
          title: 'View Employee Tickets',
          description: 'Address workplace inquiries, complaints, and requests.',
          icon: MessageSquare,
          category: 'primary',
          keywords: ['tickets', 'inquiry', 'support', 'dispute', 'concerns'],
          shortcutHint: 'T',
          perform: () => {
            setIsOpen(false)
            router.push('/hr/tickets')
          },
        },
        {
          id: 'hr-files',
          title: 'Open 201 Employee Files',
          description: 'Access digital employee 201 records, contracts, and warnings.',
          icon: FolderOpen,
          category: 'navigation',
          keywords: ['files', '201', 'employees', 'profiles', 'documents', 'records'],
          perform: () => {
            setIsOpen(false)
            router.push('/hr/files')
          },
        },
        {
          id: 'hr-policies',
          title: 'Policies & Handbooks',
          description: 'View employee handbooks and company governing policies.',
          icon: ScrollText,
          category: 'navigation',
          keywords: ['policies', 'handbook', 'terms', 'rules', 'compliance'],
          perform: () => {
            setIsOpen(false)
            router.push('/hr/policies')
          },
        },
        {
          id: 'hr-announcements',
          title: 'Create HR Broadcaster',
          description: 'Publish notices to all field technicians and employees.',
          icon: Megaphone,
          category: 'primary',
          keywords: ['broadcast', 'announcement', 'notice', 'memo', 'hr'],
          perform: () => {
            setIsOpen(false)
            router.push('/hr/announcements')
          },
        }
      )
    } else if (role === 'coordinator') {
      list.push(
        {
          id: 'coord-dispatch',
          title: 'Dispatch & Scheduling Board',
          description: 'Assign service tasks and schedule field technician teams.',
          icon: Calendar,
          category: 'primary',
          keywords: ['dispatch', 'scheduling', 'assignments', 'field', 'jobs'],
          shortcutHint: 'D',
          perform: () => {
            setIsOpen(false)
            router.push('/coordinator')
          },
        },
        {
          id: 'coord-tracking',
          title: 'Live Fleet Tracking Map',
          description: 'Real-time GPS locations and active shift telemetry.',
          icon: MapPin,
          category: 'primary',
          keywords: ['tracking', 'map', 'gps', 'fleet', 'technicians', 'live'],
          shortcutHint: 'M',
          perform: () => {
            setIsOpen(false)
            router.push('/coordinator/tracking')
          },
        },
        {
          id: 'coord-inventory',
          title: 'Tool & Parts Inventory Ledger',
          description: 'Track equipment issuances, spare parts, and return logs.',
          icon: Box,
          category: 'navigation',
          keywords: ['inventory', 'tools', 'parts', 'equipment', 'ledger', 'stock'],
          perform: () => {
            setIsOpen(false)
            router.push('/coordinator/inventory')
          },
        },
        {
          id: 'coord-announcements',
          title: 'Broadcast Field Notice',
          description: 'Send dispatch updates to technicians.',
          icon: Megaphone,
          category: 'navigation',
          keywords: ['broadcast', 'announcement', 'field', 'notice'],
          perform: () => {
            setIsOpen(false)
            router.push('/coordinator/announcements')
          },
        }
      )
    } else if (role === 'accountant') {
      list.push(
        {
          id: 'accountant-audit',
          title: 'Attendance & DTR Audit Logs',
          description: 'Verify employee attendance, clock-in timestamps, and OT hours.',
          icon: FileSpreadsheet,
          category: 'primary',
          keywords: ['audit', 'dtr', 'attendance', 'payroll', 'hours', 'logs', 'overtime'],
          shortcutHint: 'A',
          perform: () => {
            setIsOpen(false)
            router.push('/accountant')
          },
        },
        {
          id: 'accountant-announcements',
          title: 'Publish Finance Announcement',
          description: 'Post payroll schedules and deadline notices.',
          icon: Megaphone,
          category: 'navigation',
          keywords: ['announcement', 'broadcast', 'payroll', 'finance'],
          perform: () => {
            setIsOpen(false)
            router.push('/accountant/announcements')
          },
        }
      )
    }

    // Universal settings & system actions
    list.push(
      {
        id: 'toggle-theme',
        title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        description: isDark ? 'Comfortable daylight contrast theme.' : 'Restful high-contrast dark palette.',
        icon: isDark ? Sun : Moon,
        category: 'settings',
        keywords: ['theme', 'dark', 'light', 'mode', 'color', 'toggle', 'sun', 'moon'],
        perform: () => {
          toggleTheme()
          setIsOpen(false)
        },
      },
      {
        id: 'keyboard-cheat-sheet',
        title: 'Keyboard Shortcuts Guide',
        description: 'View full shortcut combinations and WCAG controls.',
        icon: Keyboard,
        category: 'settings',
        keywords: ['shortcuts', 'keyboard', 'hotkeys', 'cheat', 'wcag', 'accessibility'],
        perform: () => {
          setShowCheatSheet(true)
        },
      }
    )

    return list
  }, [role, pathname, router, isDark, toggleTheme])

  // Filter actions by search query
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return actions
    const query = searchQuery.toLowerCase().trim()
    return actions.filter((action) => {
      return (
        action.title.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        action.keywords.some((kw) => kw.includes(query))
      )
    })
  }, [actions, searchQuery])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Actions & Keyboard Shortcuts"
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={() => {
        setIsOpen(false)
        setShowCheatSheet(false)
      }}
    >
      <div
        className="w-full max-w-xl bg-[#FAF9FB] dark:bg-[#22232A] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden flex flex-col transition-colors duration-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] relative">
          <Search className="w-4 h-4 text-[#8E8D9A] dark:text-[#7A7C88] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search actions, navigation, settings... (Esc to close)"
            className="flex-1 bg-transparent text-sm font-medium text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] dark:placeholder-[#7A7C88] focus:outline-none"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] text-xs p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] text-[#7A7C88] dark:text-[#9A9BA6]">
              Esc
            </span>
          </div>
        </div>

        {/* Cheat Sheet View (If toggled) */}
        {showCheatSheet ? (
          <div className="p-5 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[#4D55CC]" />
                <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">
                  Configurable Keyboard Shortcuts
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCheatSheet(false)}
                className="text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] text-xs font-semibold"
              >
                Back to Search
              </button>
            </div>

            {/* WCAG 2.2 Criterion 2.1.4 Toggle */}
            <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between">
              <div className="flex flex-col gap-0.5 max-w-sm">
                <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">
                  Enable Single-Key Character Shortcuts
                </span>
                <span className="text-[11px] text-[#575762] dark:text-[#B0B2BD]">
                  Per WCAG 2.2 (2.1.4), single-key shortcuts can be deactivated to avoid accidental triggers with assistive tech.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shortcutsEnabled}
                  onChange={(e) => handleToggleShortcuts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4D55CC]" />
              </label>
            </div>

            <div className="space-y-2 text-[#575762] dark:text-[#B0B2BD]">
              <div className="flex items-center justify-between py-1">
                <span>Open Quick Actions Palette</span>
                <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-black/[0.06] dark:bg-white/[0.08] text-[#121215] dark:text-[#F4F4F6]">
                  Ctrl + K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Navigate Selection</span>
                <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-black/[0.06] dark:dark:bg-white/[0.08] text-[#121215] dark:text-[#F4F4F6]">
                  ↑ / ↓
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Execute Action</span>
                <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-black/[0.06] dark:bg-white/[0.08] text-[#121215] dark:text-[#F4F4F6]">
                  Enter ↵
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Dismiss Dialog / Modal</span>
                <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-black/[0.06] dark:bg-white/[0.08] text-[#121215] dark:text-[#F4F4F6]">
                  Esc
                </kbd>
              </div>
            </div>
          </div>
        ) : (
          /* Actions Result List */
          <div
            ref={listRef}
            className="max-h-[320px] overflow-y-auto p-2 space-y-1 select-none"
          >
            {filteredActions.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#8E8D9A]" />
                <span className="text-xs font-semibold text-[#575762] dark:text-[#B0B2BD]">
                  No actions found for &ldquo;{searchQuery}&rdquo;
                </span>
              </div>
            ) : (
              filteredActions.map((action, idx) => {
                const IconComponent = action.icon
                const isSelected = idx === selectedIndex

                return (
                  <div
                    key={action.id}
                    onClick={() => action.perform()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-[#4D55CC] text-[#FAF9FB]'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[#121215] dark:text-[#F4F4F6]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-white/20 text-[#FAF9FB]'
                            : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#4D55CC] dark:text-indigo-400'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate">
                          {action.title}
                        </span>
                        <span
                          className={`text-[11px] truncate ${
                            isSelected
                              ? 'text-white/80'
                              : 'text-[#575762] dark:text-[#B0B2BD]'
                          }`}
                        >
                          {action.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {action.shortcutHint && shortcutsEnabled && (
                        <kbd
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-white/20 text-[#FAF9FB]'
                              : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#8E8D9A] dark:text-[#7A7C88]'
                          }`}
                        >
                          {action.shortcutHint}
                        </kbd>
                      )}
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-white/90" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Footer Hint Bar */}
        <div className="px-4 py-2.5 border-t border-black/[0.05] dark:border-white/[0.07] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-[#8E8D9A] dark:text-[#7A7C88]">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to dismiss</span>
          </div>

          <button
            type="button"
            onClick={() => setShowCheatSheet((prev) => !prev)}
            className="hover:text-[#121215] dark:hover:text-[#F4F4F6] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Keyboard className="w-3 h-3" />
            <span>Shortcuts Guide</span>
          </button>
        </div>
      </div>
    </div>
  )
}
