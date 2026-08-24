import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export function AccessRestricted({ role, requiredModules }: { role: string, requiredModules: string[] }) {
  return (
    <div className="min-h-full flex items-center justify-center p-8 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center backdrop-blur-md bg-white/90 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-6 border border-rose-100 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
        <p className="mt-3 text-slate-500 text-sm leading-relaxed font-medium">
          Your role as <span className="font-bold text-slate-700 capitalize">{(role || '').replace('_', ' ')}</span> does not have permissions to access this module.
        </p>
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required Authorization</p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {requiredModules.map((r) => (
              <span key={r} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                {r.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <Link href="/dashboard" className="inline-flex items-center justify-center w-full px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]">
            Return to Command Center
          </Link>
        </div>
      </div>
    </div>
  )
}
