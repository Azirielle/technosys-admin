// Types and plain labels for the Inventory page (tools, borrowings, conditions).
import type { Tone } from '@/components/ui'

export type Tool = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  category: string
  serial_number: string | null
  unit_cost: number
  is_serialized: boolean
  status: 'active' | 'maintenance' | 'retired'
  total_stock: number
  available_stock: number
  created_at: string
}

export type Borrowing = {
  id: string
  tool_id: string
  technician_id: string
  quantity: number
  handed_over_at: string
  returned_at: string | null
  status: 'checked_out' | 'returned' | 'damaged' | 'lost'
  condition_on_return: 'good' | 'minor_wear' | 'damaged' | 'lost' | null
  condition_notes: string | null
  damage_fee: number
  notes: string | null
  profiles?: { full_name: string; role: string; avatar_url: string | null }
  tool_catalog?: { name: string; category: string; image_url: string | null; serial_number: string | null; unit_cost: number }
}

export type Person = { id: string; full_name: string; role: string; avatar_url: string | null }

export const CATEGORIES = ['HVAC / Refrigeration', 'Diagnostics & Testing', 'Power Tools', 'Hand Tools', 'Safety Gear', 'General Tools']

/** A tool is "low" when this many or fewer are left in the warehouse. */
export const LOW_STOCK = 2
/** A borrowed tool is overdue after this many days. */
export const OVERDUE_DAYS = 3

export const TOOL_STATUS: Record<Tool['status'], { label: string; tone: Tone }> = {
  active: { label: 'In use', tone: 'success' },
  maintenance: { label: 'Being repaired', tone: 'warning' },
  retired: { label: 'Retired', tone: 'neutral' },
}

export const BORROW_STATUS: Record<Borrowing['status'], { label: string; tone: Tone }> = {
  checked_out: { label: 'Borrowed', tone: 'info' },
  returned: { label: 'Returned', tone: 'success' },
  damaged: { label: 'Damaged', tone: 'warning' },
  lost: { label: 'Lost', tone: 'danger' },
}

export const CONDITIONS = [
  { value: 'good', label: 'Good', hint: 'Goes back on the shelf' },
  { value: 'minor_wear', label: 'Some wear', hint: 'Still usable; add a note' },
  { value: 'damaged', label: 'Damaged', hint: 'Not counted as available' },
  { value: 'lost', label: 'Lost', hint: 'Removed from stock' },
] as const

export type Condition = (typeof CONDITIONS)[number]['value']

export function daysOut(b: Borrowing) {
  const end = b.returned_at ? new Date(b.returned_at) : new Date()
  return Math.floor((end.getTime() - new Date(b.handed_over_at).getTime()) / 86400000)
}

export function isOverdue(b: Borrowing) {
  return b.status === 'checked_out' && daysOut(b) > OVERDUE_DAYS
}

/** Asset tag for a new serialized tool, e.g. TC-EQP-4821. */
export function newAssetTag() {
  return `TC-EQP-${Math.floor(1000 + Math.random() * 9000)}`
}

export function peso(n: number) {
  return `₱${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
