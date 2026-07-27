"use client"
import React, { createContext, useContext, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react"

type DialogType = 'alert' | 'confirm'
type DialogVariant = 'default' | 'destructive' | 'success'

interface DialogState {
  isOpen: boolean
  title: string
  message: string
  rawMessage?: string
  type: DialogType
  variant: DialogVariant
  resolve: ((value: boolean) => void) | null
}

interface AlertConfirmContextType {
  alert: (message: string, title?: string, variant?: DialogVariant) => Promise<boolean>
  confirm: (message: string, title?: string, variant?: DialogVariant) => Promise<boolean>
}

const AlertConfirmContext = createContext<AlertConfirmContextType | undefined>(undefined)

const sanitizeErrorMessage = (title: string, message: string) => {
  const text = `${title} ${message}`.toLowerCase();
  let cleanMessage = message;
  let rawMessage: string | undefined = undefined;

  // Signatures of raw errors
  const isRaw = 
    text.includes('unknownhostexception') || 
    text.includes('fetch failed') || 
    text.includes('network request failed') ||
    text.includes('unable to resolve host') ||
    text.includes('network error') ||
    text.includes('invalid_credentials') || 
    text.includes('invalid claim') || 
    text.includes('invalid email or password') ||
    text.includes('duplicate key value') || 
    text.includes('violates unique constraint') || 
    text.includes('already exists') ||
    text.includes('row level security') || 
    text.includes('violates row-level security') || 
    text.includes('violates rls') ||
    text.includes('violates foreign key constraint') ||
    text.includes('foreign key violation') ||
    text.includes('jwt expired') || 
    text.includes('session expired') || 
    text.includes('invalid ticket') ||
    text.includes('bucket not found') ||
    text.includes('storage bucket');

  if (isRaw) {
    rawMessage = message; // Keep original ugly trace

    // Connection / DNS errors
    if (
      text.includes('unknownhostexception') || 
      text.includes('fetch failed') || 
      text.includes('network request failed') ||
      text.includes('unable to resolve host') ||
      text.includes('network error')
    ) {
      cleanMessage = 'Connection Error. Please check your internet connection and try again.';
    }
    // Auth invalid credentials
    else if (
      text.includes('invalid_credentials') || 
      text.includes('invalid claim') || 
      text.includes('invalid email or password')
    ) {
      cleanMessage = 'Invalid email or password. Please try again.';
    }
    // Database unique key constraint
    else if (
      text.includes('duplicate key value') || 
      text.includes('violates unique constraint') || 
      text.includes('already exists')
    ) {
      cleanMessage = 'This record already exists in the system.';
    }
    // Row Level Security (RLS) policies
    else if (
      text.includes('row level security') || 
      text.includes('violates row-level security') || 
      text.includes('violates rls')
    ) {
      cleanMessage = 'Access Denied. You do not have permission to perform this action.';
    }
    // Database foreign key constraint
    else if (
      text.includes('violates foreign key constraint') ||
      text.includes('foreign key violation')
    ) {
      cleanMessage = 'Operation failed. Associated reference record was not found.';
    }
    // JWT expired
    else if (
      text.includes('jwt expired') || 
      text.includes('session expired') || 
      text.includes('invalid ticket')
    ) {
      cleanMessage = 'Your session has expired. Please log in again.';
    }
    // Supabase storage bucket errors
    else if (
      text.includes('bucket not found') ||
      text.includes('storage bucket')
    ) {
      cleanMessage = 'File system storage error. Please contact system support.';
    }
  }

  return { cleanMessage, rawMessage };
};

export function AlertConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    type: 'alert',
    variant: 'default',
    resolve: null
  })
  const [showDetails, setShowDetails] = useState(false)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const alert = (message: string, title: string = "Notice", variant: DialogVariant = 'default') => {
    setShowDetails(false)
    const { cleanMessage, rawMessage } = sanitizeErrorMessage(title, message)
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        title,
        message: cleanMessage,
        rawMessage,
        type: 'alert',
        variant,
        resolve
      })
    })
  }

  const confirm = (message: string, title: string = "Confirm Action", variant: DialogVariant = 'default') => {
    setShowDetails(false)
    const { cleanMessage, rawMessage } = sanitizeErrorMessage(title, message)
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        title,
        message: cleanMessage,
        rawMessage,
        type: 'confirm',
        variant,
        resolve
      })
    })
  }

  const handleConfirm = () => {
    if (state.resolve) state.resolve(true)
    setState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }

  const handleCancel = () => {
    if (state.resolve) state.resolve(false)
    setState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }

  // Lock body scroll when open
  useEffect(() => {
    if (state.isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [state.isOpen])

  // Keyboard accessibility with safety checks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      } else if (e.key === 'Enter') {
        // Safe check: ignore Enter key if user is typing inside an input or textarea
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return
        }
        e.preventDefault()
        handleConfirm()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isOpen, state.resolve])

  const getVariantStyles = (variant: DialogVariant) => {
    switch (variant) {
      case 'destructive':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-50 border border-rose-100',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500'
        }
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-50 border border-emerald-100',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
        }
      default:
        return {
          icon: <Info className="w-6 h-6 text-zinc-650" />,
          iconBg: 'bg-zinc-50 border border-zinc-100',
          btnClass: 'bg-zinc-950 hover:bg-zinc-800 text-white focus:ring-zinc-500'
        }
    }
  }

  const styles = getVariantStyles(state.variant)

  return (
    <AlertConfirmContext.Provider value={{ alert, confirm }}>
      {children}
      {mounted && state.isOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-150 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 flex items-start gap-4">
              <div className={`p-2.5 rounded-xl shrink-0 ${styles.iconBg}`}>
                {styles.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-zinc-950 leading-tight">{state.title}</h3>
                <p className="mt-2 text-xs text-zinc-500 leading-normal whitespace-pre-wrap">{state.message}</p>
                
                {/* Collapsible Monospace Details Accordion */}
                {state.rawMessage && (
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex items-center text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-wider cursor-pointer outline-none gap-1"
                    >
                      <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
                      <svg
                        className={`w-3 h-3 transform transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showDetails && (
                      <div className="mt-2 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 max-h-36 overflow-y-auto">
                        <code className="text-[10px] text-zinc-650 font-mono break-all whitespace-pre-wrap leading-normal">
                          {state.rawMessage}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-2.5">
              {state.type === 'confirm' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none focus:ring-2 focus:ring-zinc-350"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm outline-none focus:ring-2 ${styles.btnClass}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AlertConfirmContext.Provider>
  )
}

export function useAlertConfirm() {
  const context = useContext(AlertConfirmContext)
  if (context === undefined) {
    throw new Error("useAlertConfirm must be used within an AlertConfirmProvider")
  }
  return context
}
