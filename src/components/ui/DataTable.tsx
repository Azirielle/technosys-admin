"use client"
import React, { ReactNode } from "react"
import { LucideIcon, Inbox } from "lucide-react"

// 1. Table Container
export function TableContainer({
  children,
  className = "",
  maxHeight
}: {
  children: ReactNode
  className?: string
  maxHeight?: string
}) {
  return (
    <div
      style={maxHeight ? { maxHeight } : undefined}
      className={`bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg overflow-hidden shadow-none overflow-x-auto [scrollbar-gutter:stable] transition-colors ${className}`}
    >
      {children}
    </div>
  )
}

// 2. Table Element
export function Table({
  children,
  className = "",
  fixed = false
}: {
  children: ReactNode
  className?: string
  fixed?: boolean
}) {
  return (
    <table
      className={`w-full text-left border-collapse ${fixed ? "table-fixed" : ""} ${className}`}
    >
      {children}
    </table>
  )
}

// 3. Table Head
export function TableHead({
  children,
  className = "",
  sticky = false
}: {
  children: ReactNode
  className?: string
  sticky?: boolean
}) {
  return (
    <thead
      className={`bg-zinc-50 dark:bg-zinc-800/90 border-b border-zinc-200/80 dark:border-zinc-800 ${
        sticky ? "sticky top-0 z-10 backdrop-blur-xs" : ""
      } ${className}`}
    >
      {children}
    </thead>
  )
}

// 4. Table Header Cell
export function TableHeaderCell({
  children,
  className = "",
  align = "left",
  numeric = false,
  width,
  noDivider = false
}: {
  children: ReactNode
  className?: string
  align?: "left" | "center" | "right"
  numeric?: boolean
  width?: string
  noDivider?: boolean
}) {
  const finalAlign = numeric ? "right" : align
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right"
  }

  return (
    <th
      style={width ? { width } : undefined}
      className={`px-3 py-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[-0.01em] whitespace-nowrap ${
        numeric ? "font-mono tabular-nums" : ""
      } ${
        !noDivider ? "border-r border-zinc-200/80 dark:border-zinc-800" : ""
      } ${alignClasses[finalAlign]} ${className}`}
    >
      {children}
    </th>
  )
}

// 5. Table Body
export function TableBody({
  children,
  className = ""
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <tbody className={`divide-y divide-zinc-200/80 dark:divide-zinc-800 ${className}`}>
      {children}
    </tbody>
  )
}

// 6. Table Row
export function TableRow({
  children,
  className = "",
  onClick,
  selected = false
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
}) {
  return (
    <tr
      onClick={onClick}
      className={`h-[34px] ${
        onClick ? "cursor-pointer" : ""
      } ${
        selected
          ? "bg-blue-50/60 dark:bg-blue-950/40"
          : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60"
      } transition-colors duration-75 group ${className}`}
    >
      {children}
    </tr>
  )
}

// 7. Table Cell
export function TableCell({
  children,
  className = "",
  align = "left",
  numeric = false,
  noDivider = false,
  colSpan
}: {
  children?: ReactNode
  className?: string
  align?: "left" | "center" | "right"
  numeric?: boolean
  noDivider?: boolean
  colSpan?: number
}) {
  const finalAlign = numeric ? "right" : align
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right"
  }

  return (
    <td
      colSpan={colSpan}
      className={`px-3 py-1.5 text-[12px] tracking-[-0.01em] text-zinc-900 dark:text-zinc-100 ${
        numeric ? "font-mono tabular-nums" : ""
      } ${
        !noDivider ? "border-r border-zinc-200/80 dark:border-zinc-800" : ""
      } ${alignClasses[finalAlign]} ${className}`}
    >
      {children}
    </td>
  )
}

// 8. Table Empty State
export function TableEmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description = "Try adjusting your search query or filters.",
  colSpan = 10,
  className = ""
}: {
  icon?: LucideIcon
  title?: string
  description?: string
  colSpan?: number
  className?: string
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={`p-12 text-center ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mx-auto mb-2.5 text-zinc-400 dark:text-zinc-500">
          <Icon className="w-5 h-5 stroke-[1.8]" />
        </div>
        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{title}</h4>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm mx-auto font-medium">
          {description}
        </p>
      </td>
    </tr>
  )
}

// 9. Status Dot (Linear-Style Minimal Indicator)
export function StatusDot({
  status,
  label,
  icon: Icon,
  title,
  className = ""
}: {
  status: 'active' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'
  label: ReactNode
  icon?: LucideIcon
  title?: string
  className?: string
}) {
  const dotColor = {
    active: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    neutral: 'bg-zinc-400 dark:bg-zinc-500',
    purple: 'bg-purple-500'
  }[status];

  return (
    <span 
      title={title}
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap ${className}`}
    >
      {Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      )}
      <span>{label}</span>
    </span>
  );
}

// 10. Muted Badge (Neutral Zinc Pill for Roles / Secondary Meta)
export function MutedBadge({
  children,
  className = "",
  title
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span 
      title={title}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

