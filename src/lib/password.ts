// The admin password rule, the same in the browser (AccountModals) and on the server (actions/credentials).
// Andrew, 28 Nov: a password of only spaces was accepted. Spaces don't count toward the length, and spaces at the
// start or end are refused instead of quietly removed (the saved password must be exactly what was typed).
export const MIN_PASSWORD = 6

/** What's wrong with a new password, or null when it's fine. */
export function passwordProblem(password: string): string | null {
  if (!password.trim()) return "The password can't be only spaces."
  if (password !== password.trim()) return 'Remove the spaces at the start or end.'
  if (password.replace(/\s/g, '').length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters (spaces don't count).`
  return null
}
