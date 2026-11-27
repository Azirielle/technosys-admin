// Run from Admin-side: node --test src/lib/password.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { passwordProblem } from './password.ts'

test('password rule', () => {
  assert.notEqual(passwordProblem('        '), null) // only spaces
  assert.notEqual(passwordProblem(' abc123'), null) // space at the start
  assert.notEqual(passwordProblem('ab   c'), null) // 3 characters plus spaces
  assert.equal(passwordProblem('abc123'), null)
  assert.equal(passwordProblem('my pass 1'), null) // spaces inside are fine
})
