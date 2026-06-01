import { Metadata } from "next"
import LoginForm from "@/components/login-form"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Login | Technosis HRIS",
  description: "Login to your HRIS Administrator account.",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 overflow-hidden relative">
      {/* Premium Dark Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span className="text-emerald-500">TechnoSys</span> HRIS
          </h1>
          <p className="mt-2 text-zinc-400 font-semibold text-xs uppercase tracking-widest">
            Corporate Operations Portal
          </p>
        </div>
        
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
