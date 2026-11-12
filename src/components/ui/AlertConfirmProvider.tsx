"use client"
import React, { createContext, useContext, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react"
import { getCleanErrorMessage } from "@/lib/error-sanitizer"

type DialogType = 'alert' | 'confirm'
type DialogVariant = 'default' | 'destructive' | 'success'

interface DialogState {
  isOpen: boolean
  title: string
  message: string
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
  return getCleanErrorMessage(message);
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

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const alert = (message: string, title: string = "Notice", variant: DialogVariant = 'default') => {
    const cleanMessage = sanitizeErrorMessage(title, message)
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        title,
        message: cleanMessage,
        type: 'alert',
        variant,
        resolve
      })
    })
  }

  const confirm = (message: string, title: string = "Confirm Action", variant: DialogVariant = 'default') => {
    const cleanMessage = sanitizeErrorMessage(title, message)
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        title,
        message: cleanMessage,
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
          icon: <AlertTriangle className="w-4 h-4 stroke-[1.8] text-rose-600 dark:text-rose-400" />,
          iconBg: 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
        }
      case 'success':
        return {
          icon: <CheckCircle className="w-4 h-4 stroke-[1.8] text-emerald-600 dark:text-emerald-400" />,
          iconBg: 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
        }
      default:
        return {
          icon: <Info className="w-4 h-4 stroke-[1.8] text-zinc-600 dark:text-zinc-300" />,
          iconBg: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/80 dark:border-zinc-700/80',
          btnClass: 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs'
        }
    }
  }

  const styles = getVariantStyles(state.variant)

  return (
    <AlertConfirmContext.Provider value={{ alert, confirm }}>
      {children}
      {mounted && state.isOpen && createPortal(
        <div className="fixed inset-0 bg-zinc-900/60 dark:bg-zinc-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full shadow-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-[0.98] duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2.5 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${styles.iconBg}`}>
                {styles.icon}
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">{state.title}</h3>
            </div>

            {/* Body */}
            <div className="p-5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-3">
              <p className="whitespace-pre-wrap">{state.message}</p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-end gap-2">
              {state.type === 'confirm' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${styles.btnClass}`}
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
