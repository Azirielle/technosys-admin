"use client"
import React, { ReactNode, useEffect } from "react"
import { LucideIcon, X } from "lucide-react"

export interface ModalDialogProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  iconVariant?: "blue" | "emerald" | "rose" | "amber" | "default"
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl"
  contentHeight?: string
  children: ReactNode
  footer?: ReactNode
  headerExtra?: ReactNode
  className?: string
  zIndex?: string
}

export default function ModalDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconVariant = "default",
  maxWidth = "lg",
  contentHeight,
  children,
  footer,
  headerExtra,
  className = "",
  zIndex = "z-[90]"
}: ModalDialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl"
  }

  const iconVariants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80",
    blue: "bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60",
    emerald: "bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60",
    rose: "bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60",
    amber: "bg-amber-50/60 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60"
  }

  return (
    <div
      className={`fixed inset-0 bg-zinc-900/60 dark:bg-zinc-950/80 backdrop-blur-xs ${zIndex} flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150`}
    >
      <div
        className={`bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full ${
          maxWidthClasses[maxWidth]
        } ${
          contentHeight ? contentHeight : "max-h-[90vh]"
        } flex flex-col overflow-hidden border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in zoom-in-[0.98] duration-150 transition-colors ${className}`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${iconVariants[iconVariant]}`}
              >
                <Icon className="w-4 h-4 stroke-[1.8]" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight truncate">
                {title}
              </div>
              {subtitle && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 truncate">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-zinc-700 dark:text-zinc-300">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
