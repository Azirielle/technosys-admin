"use server"

import { getDtrRecords as getDtrRecordsImpl } from './dtr/getDtrRecords'
import type { DtrResult } from './dtr/types'

// Re-export DTR types and actions so existing imports from '@/app/actions/audit' continue to work without modification.
export type {
  DailyAuditRecord,
  EmployeeAuditSummary,
  DtrResult,
  DtrJob,
} from './dtr/types'

export async function getDtrRecords(
  startDate: string,
  endDate: string,
  roleFilter: 'all' | 'technician' | 'helper' = 'all'
): Promise<DtrResult> {
  return getDtrRecordsImpl(startDate, endDate, roleFilter)
}
