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
      className={`bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs overflow-x-auto [scrollbar-gutter:stable] transition-colors ${className}`}
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
      className={`bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-800 ${
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
  width,
  noDivider = false
}: {
  children: ReactNode
  className?: string
  align?: "left" | "center" | "right"
  width?: string
  noDivider?: boolean
}) {
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right"
  }

  return (
    <th
      style={width ? { width } : undefined}
      className={`px-3.5 py-2.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap ${
        !noDivider ? "border-r border-zinc-200/80 dark:border-zinc-800" : ""
      } ${alignClasses[align]} ${className}`}
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
      className={`${
        onClick ? "cursor-pointer" : ""
      } ${
        selected
          ? "bg-blue-50/60 dark:bg-blue-950/40"
          : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
      } transition-colors group ${className}`}
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
  noDivider = false,
  colSpan
}: {
  children?: ReactNode
  className?: string
  align?: "left" | "center" | "right"
  noDivider?: boolean
  colSpan?: number
}) {
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right"
  }

  return (
    <td
      colSpan={colSpan}
      className={`px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 ${
        !noDivider ? "border-r border-zinc-200/80 dark:border-zinc-800" : ""
      } ${alignClasses[align]} ${className}`}
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
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mx-auto mb-3 shadow-2xs text-zinc-400 dark:text-zinc-500">
          <Icon className="w-6 h-6 stroke-[1.8]" />
        </div>
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto font-medium">
          {description}
        </p>
      </td>
    </tr>
  )
}
