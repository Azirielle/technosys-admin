import { Metadata } from "next"
import LoginForm from "@/components/login-form"
import { Suspense } from "react"
import LoginClientWrapper from "@/components/login-client-wrapper"

export const metadata: Metadata = {
  title: "Login | TechnoSys Hub",
  description: "Secure login to the TechnoSys employee hub.",
}

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const isTechnicianPortal = searchParams?.next === '/technician';
  
  return (
    <LoginClientWrapper isTechnicianPortal={isTechnicianPortal}>
      <Suspense fallback={
        <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-8 h-[400px] flex items-center justify-center shadow-xl">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </LoginClientWrapper>
  )
}
