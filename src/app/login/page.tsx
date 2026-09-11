import Image from 'next/image'
import { Mail, Lock, ArrowRight, AlertCircle, Terminal } from 'lucide-react'
import { login } from './actions'
import { PortfolioShowcase } from '@/components/auth/PortfolioShowcase'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const resolvedSearchParams = await searchParams

  return (
    <div className="min-h-[100dvh] w-full flex flex-col lg:flex-row bg-zinc-950">
      {/* Left Side: 58% HVAC Portfolio Showcase */}
      <div className="w-full lg:w-[58%] xl:w-[60%] shrink-0">
        <PortfolioShowcase />
      </div>

      {/* Right Side: 42% Branded Authentication Console */}
      <div className="w-full lg:w-[42%] xl:w-[40%] flex flex-col justify-between bg-zinc-50 p-6 sm:p-10 lg:p-12 xl:p-14 border-t lg:border-t-0 lg:border-l border-zinc-200 min-h-screen">
        {/* Top Header & Organization Lockup */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-2xs overflow-hidden p-1">
              <Image 
                src="/logo.png" 
                alt="TechnoCycle Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="font-serif font-bold tracking-tight text-zinc-900 text-base sm:text-lg leading-none">
                TECHNOCYCLE
              </div>
              <div className="text-[10px] tracking-widest text-zinc-500 font-semibold uppercase mt-0.5">
                CORPORATION
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-zinc-200/70 border border-zinc-300/80 text-[10px] font-mono font-semibold uppercase text-zinc-700 tracking-wider shadow-2xs">
            PROD TERMINAL
          </div>
        </div>

        {/* Center: Auth Console Form */}
        <div className="w-full max-w-md mx-auto my-auto py-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              Operations Portal
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Sign in to access centralized HVAC dispatch, live attendance audits, and equipment tracking.
            </p>
          </div>

          {resolvedSearchParams?.message && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 flex items-start gap-3 text-rose-700 text-xs shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Notice</p>
                <p className="mt-0.5 text-rose-600">{resolvedSearchParams.message}</p>
              </div>
            </div>
          )}

          <form className="space-y-4" action={login}>
            <div className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Corporate Email
                </label>
                <div className="relative rounded-xl border border-zinc-200 bg-white shadow-2xs focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-all">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="admin@technocycle.com.ph"
                    className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Password
                </label>
                <div className="relative rounded-xl border border-zinc-200 bg-white shadow-2xs focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-all">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Developer / Operations Testing Role Override */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="role_override" className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Session Role Injection</span>
                  </label>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600">
                    TESTING OVERRIDE
                  </span>
                </div>
                <select 
                  id="role_override" 
                  name="role_override" 
                  defaultValue="auto"
                  className="block w-full rounded-lg border border-zinc-300 py-1.5 px-2.5 text-xs text-zinc-800 focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 bg-white cursor-pointer"
                >
                  <option value="auto">Auto (Fetch from DB Role / Fallback)</option>
                  <option value="/ceo">CEO Executive (/ceo)</option>
                  <option value="/hr">HR Department (/hr)</option>
                  <option value="/coordinator">Field Operations Coordinator (/coordinator)</option>
                  <option value="/accountant">Financial Accountant (/accountant)</option>
                </select>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Directs middleware session routing immediately upon authentication.
                </p>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 px-4 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Sign in to Terminal</span>
                <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
              </button>
            </div>
          </form>
        </div>

        {/* Bottom Footer & Security Badge */}
        <div className="pt-6 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-zinc-600 font-medium">Edge Gateway Live</span>
            <span className="text-zinc-300">•</span>
            <span>TLS 1.3 Encrypted</span>
          </div>
          <div className="text-zinc-400 font-mono text-[11px]">
            © 2026 TechnoCycle Corporation
          </div>
        </div>
      </div>
    </div>
  )
}
