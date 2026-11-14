'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCleanErrorMessage } from '@/lib/error-sanitizer'

export default function TrackingErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[FleetTrackingError] Handled error in fleet tracking route:', error)
  }, [error])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface-soft p-6">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger border border-transparent">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-ink">Fleet Tracking Connection Interrupted</h2>
        <p className="mt-2 text-xs text-ink-2 leading-relaxed">
          {error?.message ? getCleanErrorMessage(error.message, 'Unable to connect to the fleet location service. Please check your network connection and retry.') : 'Unable to connect to the fleet location service. Please check your network connection and retry.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-pill bg-action px-4 py-2 text-xs font-semibold text-on-action hover:bg-action-hover transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Connection
          </button>
          <Link
            href="/coordinator"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Scheduling Board
          </Link>
        </div>
      </div>
    </div>
  )
}
