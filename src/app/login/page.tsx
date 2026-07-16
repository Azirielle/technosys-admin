import { Metadata } from "next"
import LoginForm from "@/components/login-form"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Login | TechnoSys Admin Control Center",
  description: "Secure login to the TechnoSys HRIS enterprise administration console.",
}

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const isTechnicianPortal = searchParams?.next === '/technician';
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 overflow-hidden relative">
      {/* Subtle Corporate Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60"></div>
      
      {/* Decorative corporate blur highlights */}
      <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-cyan-500/5 rounded-full blur-[80px]"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          {/* Logo container */}
          <div className="mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
            <img src="/logo.png" alt="Technocycle" className="h-20 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-1">
            <span className="text-emerald-600">TechnoSys</span> <span className="font-semibold text-slate-500">HRIS</span>
          </h1>
          <p className="mt-1 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
            {isTechnicianPortal ? "Employee Portal Login" : "Enterprise Administration Console"}
          </p>
        </div>
        
        <Suspense fallback={
          <div className="bg-white border border-slate-200 rounded-2xl p-8 h-64 flex items-center justify-center shadow-md">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
