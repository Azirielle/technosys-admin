// Run from Admin-side: node --test src/app/actions/dtr/leaveCredits.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildEmployeeLeaveMap } from './leaveCredits.ts'

// 6 vacation days, Mon 4 to Sat 9 Jan 2027: 5 vacation credits, then the 6th day
const leave = (sick_days: number) => [{ id: 'l1', technician_id: 't', start_date: '2027-01-04', end_date: '2027-01-09', leave_type: 'vacation', status: 'approved', sick_days }]
test('extra vacation day: unpaid, or from sick credits when HR chose that', () => {
  assert.equal(buildEmployeeLeaveMap(leave(0), '2027-01-01', '2027-01-31').get('2027-01-09')?.label, 'without_credits')
  assert.equal(buildEmployeeLeaveMap(leave(1), '2027-01-01', '2027-01-31').get('2027-01-09')?.label, 'sick')
  assert.equal(buildEmployeeLeaveMap(leave(1), '2027-01-01', '2027-01-31').get('2027-01-08')?.label, 'vacation')
})
