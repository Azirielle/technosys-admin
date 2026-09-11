"use client"
import React, { ReactNode } from "react"
import { LucideIcon } from "lucide-react"

export interface KpiCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  subtext?: string
  badge?: string
  badgeVariant?: "default" | "blue" | "emerald" | "rose" | "amber"
  variant?: "default" | "blue" | "emerald" | "rose" | "amber"
  className?: string
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  subtext,
  badge,
  badgeVariant = "default",
  variant = "default",
  className = ""
}: KpiCardProps) {
  const iconVariants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
    blue: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
  }

  const badgeVariants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
    blue: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
  }

  return (
    <div
      className={`bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center justify-between gap-3 transition-colors ${className}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
            {value}
          </p>
          {badge && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${badgeVariants[badgeVariant]}`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtext && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-1 truncate">
            {subtext}
          </p>
        )}
      </div>

      {Icon && (
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${iconVariants[variant]}`}
        >
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
      )}
    </div>
  )
}

export function KpiGrid({
  children,
  columns = 4,
  className = ""
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}) {
  const colClasses = {
    2: "grid grid-cols-1 sm:grid-cols-2",
    3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  }

  return (
    <div className={`gap-3.5 mb-6 ${colClasses[columns]} ${className}`}>
      {children}
    </div>
  )
}
