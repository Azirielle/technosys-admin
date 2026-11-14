/**
 * Philippine mobile numbers are stored as 11 digits (09XXXXXXXXX).
 * Accepts 09171234567, +639171234567, 639171234567 or 9171234567. Returns null if it isn't a valid mobile number.
 * The database applies the same rule (normalize_ph_mobile), so both sides always agree.
 */
export function normalizePhMobile(input: string | null | undefined): string | null {
  const digits = (input || '').replace(/\D/g, '')
  if (/^09\d{9}$/.test(digits)) return digits
  if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`
  if (/^9\d{9}$/.test(digits)) return `0${digits}`
  return null
}

/** 09171234567 -> 0917 123 4567 */
export function formatPhMobile(input: string | null | undefined): string {
  const n = normalizePhMobile(input)
  return n ? `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : (input || '')
}
