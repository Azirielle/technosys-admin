import Image from 'next/image'
import { AlertCircle } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoginPolicyModal } from '@/components/auth/LoginPolicyModal'
import { LoginBackgroundCarousel } from '@/components/auth/LoginBackgroundCarousel'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const resolvedSearchParams = await searchParams

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden flex items-center justify-center relative bg-[#060B14] select-none text-slate-100">
      
      {/* Cinematic Landmark Crossfade Background */}
      <LoginBackgroundCarousel />

      {/* Floating Centered Glassmorphic Portal */}
      <main className="w-full max-w-[440px] px-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[#081020]/75 border border-white/15 border-t-white/30 backdrop-blur-2xl rounded-3xl p-7 sm:p-8 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)] text-center relative overflow-hidden">
          
          {/* Subtle Ambient Top Edge Accent */}
          <div 
            className="absolute -top-[1px] left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-sky-400/80 to-transparent" 
            aria-hidden="true" 
          />

          {/* Master Inverted Dark Mode Brand Emblem */}
          <div className="relative inline-flex items-center justify-center w-22 h-22 mb-3 filter drop-shadow-[0_0_16px_rgba(56,189,248,0.35)] transition-transform duration-300 hover:scale-105">
            <Image 
              src="/technocycle_logo_dark.png" 
              alt="TechnoCycle Logo" 
              width={88} 
              height={88} 
              unoptimized
              className="w-full h-full object-contain"
              priority
            />
          </div>

          {/* Heading Lockup */}
          <div className="space-y-1 mb-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              Welcome Back
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Sign in with your authorized TechnoCycle administrative account.
            </p>
          </div>

          {/* Notice Alert if present */}
          {resolvedSearchParams?.message && (
            <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-900/60 p-3 flex items-start gap-2.5 text-white text-xs text-left shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-300 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-100">Notice</p>
                <p className="mt-0.5 text-rose-200 text-xs leading-relaxed">
                  {resolvedSearchParams.message}
                </p>
              </div>
            </div>
          )}

          {/* Interactive Form Component */}
          <LoginForm />

          {/* Institutional Compliance Policy Trigger */}
          <div className="pt-4 text-center space-y-1">
            <LoginPolicyModal variant="on-blue" />
            <p className="text-[11px] text-slate-400/80">
              Authorized internal access only. Activity monitored under RA 10173.
            </p>
          </div>

        </div>
      </main>

    </div>
  )
}
