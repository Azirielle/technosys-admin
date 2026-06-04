import { Metadata } from "next"
import LoginForm from "@/components/login-form"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Login | TechnoSys Admin Control Center",
  description: "Secure login to the TechnoSys HRIS enterprise administration console.",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060608] p-4 overflow-hidden relative">
      {/* Precision Dark Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] opacity-80"></div>
      
      {/* Cinematic, hardware-feeling radial highlights */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[100px] animate-radial-glow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[100px] animate-radial-glow" style={{ animationDelay: '-8s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-[140px]"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          {/* Double-Bezel Logo Container */}
          <div className="mb-5 bg-white/5 p-1.5 rounded-[2rem] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center">
            <div className="bg-[#0f0f15]/90 px-6 py-4 rounded-[calc(2rem-0.375rem)] flex items-center justify-center border border-white/5 shadow-inner">
              <img src="/logo.png" alt="Technocycle" className="h-16 w-auto object-contain filter drop-shadow-[0_4px_12px_rgba(16,185,129,0.15)]" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">TechnoSys</span> 
            <span className="font-light text-slate-400 text-2xl tracking-wide">HRIS</span>
          </h1>
          <p className="mt-2 text-slate-500 font-semibold text-[10px] uppercase tracking-[0.25em]">
            Enterprise Administration Console
          </p>
        </div>
        
        <Suspense fallback={
          <div className="bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-64 flex items-center justify-center shadow-2xl">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
