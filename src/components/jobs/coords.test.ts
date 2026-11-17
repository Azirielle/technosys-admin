// Test for parseCoords. Run from Admin-side: node --test src/components/jobs/coords.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCoords } from './coords.ts'

test('reads coordinates pasted from Google Maps', () => {
  assert.deepEqual(parseCoords('14.3439, 121.0617'), [14.3439, 121.0617])
  assert.deepEqual(parseCoords('  14.3439,121.0617 '), [14.3439, 121.0617])
  assert.deepEqual(parseCoords('14.3439 121.0617'), [14.3439, 121.0617])
})

test('ignores ordinary addresses and impossible numbers', () => {
  assert.equal(parseCoords('Blk 5 Lot 12, Pacita Complex'), null)
  assert.equal(parseCoords('123, 456'), null) // a street number, not a place
  assert.equal(parseCoords('15 2'), null) // "15 2nd Avenue" while typing
  assert.equal(parseCoords('95.1, 121.0'), null)
  assert.equal(parseCoords(''), null)
})
