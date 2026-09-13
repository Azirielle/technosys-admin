"use client"
import React, { ReactNode } from "react"
import { AlertTriangle, AlertCircle, HelpCircle, Loader2, LucideIcon } from "lucide-react"
import ModalDialog from "./ModalDialog"

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: ReactNode
  description: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'neutral'
  icon?: LucideIcon
  isPending?: boolean
  zIndex?: string
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  icon,
  isPending = false,
  zIndex = "z-[100]"
}: ConfirmDialogProps) {
  const defaultIcons: Record<'danger' | 'warning' | 'neutral', LucideIcon> = {
    danger: AlertTriangle,
    warning: AlertCircle,
    neutral: HelpCircle
  }

  const iconVariants: Record<'danger' | 'warning' | 'neutral', 'rose' | 'amber' | 'default'> = {
    danger: 'rose',
    warning: 'amber',
    neutral: 'default'
  }

  const confirmBtnStyles: Record<'danger' | 'warning' | 'neutral', string> = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
    neutral: 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs'
  }

  const IconComponent = icon || defaultIcons[variant]

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={IconComponent}
      iconVariant={iconVariants[variant]}
      maxWidth="sm"
      zIndex={zIndex}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${confirmBtnStyles[variant]}`}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      }
    >
      <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
        {description}
      </div>
    </ModalDialog>
  )
}
