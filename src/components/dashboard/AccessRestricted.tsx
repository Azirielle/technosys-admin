import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export function AccessRestricted({ role, requiredModules }: { role: string, requiredModules: string[] }) {
  return (
    <div className="min-h-full flex items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl p-8 text-center backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600"></div>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6 border border-rose-100 dark:border-rose-900 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Access Restricted</h2>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium">
          Your role as <span className="font-bold text-zinc-700 dark:text-zinc-200 capitalize">{(role || '').replace('_', ' ')}</span> does not have permissions to access this module.
        </p>
        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Required Authorization</p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {requiredModules.map((r) => (
              <span key={r} className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
                {r.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <Link href="/dashboard" className="inline-flex items-center justify-center w-full px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]">
            Return to Command Center
          </Link>
        </div>
      </div>
    </div>
  )
}
