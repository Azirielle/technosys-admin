// Test for daysOut (calendar days in Manila). Run from Admin-side: node --test src/components/inventory/types.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysOut, isOverdue, type Borrowing } from './types.ts'

const lent = (out: string, back: string | null, status = 'returned') =>
  ({ handed_over_at: out, returned_at: back, status }) as Borrowing

test('lent Monday morning, back Thursday early morning = 3 days', () => {
  assert.equal(daysOut(lent('2026-11-16T07:30:00+08:00', '2026-11-19T05:00:00+08:00')), 3)
})

test('same day in Manila = 0, even across UTC midnight', () => {
  // 12:10 AM Manila is still the day before in UTC; both times are one Manila day
  assert.equal(daysOut(lent('2026-11-16T00:10:00+08:00', '2026-11-16T23:59:00+08:00')), 0)
})

test('11 PM to 1 AM next day = 1 day', () => {
  assert.equal(daysOut(lent('2026-11-16T23:00:00+08:00', '2026-11-17T01:00:00+08:00')), 1)
})

test('overdue only after more than 3 days out', () => {
  const out = new Date(Date.now() - 4 * 86400000).toISOString()
  assert.equal(isOverdue(lent(out, null, 'checked_out')), true)
  assert.equal(isOverdue(lent(new Date().toISOString(), null, 'checked_out')), false)
})
