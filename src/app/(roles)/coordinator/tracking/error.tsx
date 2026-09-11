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
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Fleet Tracking Connection Interrupted</h2>
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          {error.message || 'Unable to connect to the fleet telemetry stream. This may be caused by a transient network reset or server reconnection.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Fleet Radar
          </button>
          <Link
            href="/coordinator"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Scheduling Board
          </Link>
        </div>
      </div>
    </div>
  )
}
