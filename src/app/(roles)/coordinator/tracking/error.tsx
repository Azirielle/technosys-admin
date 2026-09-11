'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Fleet Tracking Connection Interrupted</h2>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {error.message || 'Unable to connect to the fleet telemetry stream. This may be caused by a transient network reset or server reconnection.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 dark:bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Fleet Radar
          </button>
          <Link
            href="/coordinator"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-950 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Scheduling Board
          </Link>
        </div>
      </div>
    </div>
  )
}
