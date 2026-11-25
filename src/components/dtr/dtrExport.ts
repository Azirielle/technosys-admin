// Export the DTR summary for one cut-off to Excel (.xlsx) or CSV, with a totals row.
import type { EmployeeAuditSummary } from '@/app/actions/audit'
import type { Cutoff } from './cutoffs'

const HEADERS = [
  'Employee',
  'Role',
  'Level',
  'Employment status',
  'Days worked',
  'Hours worked',
  'Times late',
  'Minutes late',
  'Regular OT (h)',
  'Sunday (h)',
  'Regular holiday (h)',
  'Special holiday (h)',
  'Night diff (h)',
  'Sick leave',
  'Vacation leave',
  'Salary deduction',
]

function round1(n: number) {
  return Math.round(n * 10) / 10
}

/** Title lines, header, one row per person, then totals. Used by both exports. */
function buildRows(cutoff: Cutoff, records: EmployeeAuditSummary[]): (string | number)[][] {
  const sum = (pick: (r: EmployeeAuditSummary) => number) => round1(records.reduce((n, r) => n + pick(r), 0))
  return [
    ['Technocycle daily time record (DTR)'],
    ['Cut-off', cutoff.label],
    ['Generated', new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })],
    [],
    HEADERS,
    ...records.map((r) => [
      r.name,
      r.role,
      r.level,
      r.status,
      r.daysWorked,
      r.totalHours,
      r.lateCount,
      r.totalLateMinutes,
      r.regOtHours,
      r.sundayHours,
      r.regularHolidayHours,
      r.specialHolidayHours,
      r.nightDiffHours,
      r.sickLeaveDays,
      r.vacationLeaveDays,
      r.salaryDeductionDays,
    ]),
    [],
    [
      'Total',
      '',
      '',
      '',
      sum((r) => r.daysWorked),
      sum((r) => r.totalHours),
      sum((r) => r.lateCount),
      sum((r) => r.totalLateMinutes),
      sum((r) => r.regOtHours),
      sum((r) => r.sundayHours),
      sum((r) => r.regularHolidayHours),
      sum((r) => r.specialHolidayHours),
      sum((r) => r.nightDiffHours),
      sum((r) => r.sickLeaveDays),
      sum((r) => r.vacationLeaveDays),
      sum((r) => r.salaryDeductionDays),
    ],
  ]
}

export async function exportDtrExcel(cutoff: Cutoff, records: EmployeeAuditSummary[]) {
  const XLSX = await import('xlsx')
  const sheet = XLSX.utils.aoa_to_sheet(buildRows(cutoff, records))
  sheet['!cols'] = HEADERS.map((h, i) => ({ wch: i === 0 ? 28 : Math.max(12, h.length + 2) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'DTR')
  XLSX.writeFile(book, `technocycle_dtr_${cutoff.id}.xlsx`)
}

export function exportDtrCsv(cutoff: Cutoff, records: EmployeeAuditSummary[]) {
  const cell = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const text = buildRows(cutoff, records).map((row) => row.map(cell).join(',')).join('\n')
  // The BOM makes Excel read the file as UTF-8 (names with ñ stay correct).
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `technocycle_dtr_${cutoff.id}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
