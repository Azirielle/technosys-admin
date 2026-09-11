"use client"
import React, { ReactNode } from "react"
import { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  className = ""
}: PageHeaderProps) {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 px-6 py-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${className}`}
    >
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 shadow-2xs">
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
