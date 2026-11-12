/**
 * Enterprise Client Error Sanitizer
 * Transforms internal system, database, PostgREST, and network exceptions
 * into actionable, user-friendly operational messages.
 * Prevents schema names, table identifiers, stack traces, and SQL constraints
 * from leaking to client interfaces.
 */

export function getCleanErrorMessage(err: unknown, defaultMessage: string = 'Unable to complete request. Please verify your information or try again.'): string {
  if (!err) return defaultMessage

  const raw = typeof err === 'string' ? err : (err as any)?.message || String(err)
  const text = raw.toLowerCase()

  // 1. Database Unique Constraints / Duplicates
  if (
    text.includes('duplicate key') ||
    text.includes('violates unique constraint') ||
    text.includes('already exists')
  ) {
    if (text.includes('time_logs') || text.includes('punch') || text.includes('dtr')) {
      return 'A shift or attendance entry for this period has already been recorded.'
    }
    if (text.includes('email') || text.includes('users_email')) {
      return 'An account with this email address already exists in the system.'
    }
    if (text.includes('phone') || text.includes('contact')) {
      return 'An employee or profile with this contact number is already registered.'
    }
    if (text.includes('schedule') || text.includes('dispatch')) {
      return 'A dispatch assignment for this technician and schedule window already exists.'
    }
    if (text.includes('holiday')) {
      return 'A calendar holiday entry for this date has already been registered.'
    }
    return 'This record already exists in the system.'
  }

  // 2. Row Level Security (RLS) & Authorization
  if (
    text.includes('row level security') ||
    text.includes('violates row-level security') ||
    text.includes('violates rls') ||
    text.includes('permission denied') ||
    text.includes('unauthorized') ||
    text.includes('forbidden')
  ) {
    return 'You do not have administrative authorization to perform this action.'
  }

  // 3. Database Foreign Key / Reference Constraints
  if (
    text.includes('violates foreign key constraint') ||
    text.includes('foreign key violation') ||
    text.includes('is still referenced from table')
  ) {
    return 'Operation blocked: This record is currently linked to other active system records.'
  }

  // 4. Missing Required Fields / Not-Null Constraints
  if (
    text.includes('violates not-null constraint') ||
    text.includes('null value in column')
  ) {
    return 'Required information is missing. Please ensure all mandatory fields are completed.'
  }

  // 5. Authentication & Session Errors
  if (
    text.includes('jwt expired') ||
    text.includes('session expired') ||
    text.includes('invalid claim') ||
    text.includes('token is expired')
  ) {
    return 'Your secure session has expired. Please log in again to continue.'
  }
  if (
    text.includes('invalid_credentials') ||
    text.includes('invalid login credentials') ||
    text.includes('invalid email or password')
  ) {
    return 'Invalid credentials. Please verify your email and password and try again.'
  }

  // 6. Network & Connection Failures
  if (
    text.includes('failed to fetch') ||
    text.includes('network request failed') ||
    text.includes('network error') ||
    text.includes('unknownhostexception') ||
    text.includes('unable to resolve host') ||
    text.includes('timeout') ||
    text.includes('connection refused')
  ) {
    return 'Connection issue. Please verify your internet connection and retry.'
  }

  // 7. General PostgREST / Database / SQL Syntax Leakage Catch-All
  if (
    text.includes('pgrst') ||
    text.includes('relation "') ||
    text.includes('table "') ||
    text.includes('column "') ||
    text.includes('syntax error at or near') ||
    text.includes('postgresql') ||
    text.includes('postgres') ||
    text.includes('database transaction failed') ||
    text.includes('database error') ||
    text.includes('database insert failed') ||
    text.includes('500 internal')
  ) {
    return 'The service was unable to complete this action. Please refresh the page and try again.'
  }

  // 8. If clean human-readable message without DB jargon, return it
  return raw
}
