// Admin login page: the sign-in form on the left, Technocycle project photos on the right (wide screens only).
import Image from 'next/image'
import { AlertCircle } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoginPolicyModal } from '@/components/auth/LoginPolicyModal'
import { LoginShowcase } from '@/components/auth/LoginShowcase'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams

  return (
    <div className="grid min-h-screen grid-cols-1 gap-4 bg-bg p-4 lg:grid-cols-2">
      <main className="flex items-center justify-center px-2 py-10">
        <div className="w-full max-w-sm">
          {/* Light and dark versions of the logo; CSS shows the one that fits the theme. */}
          <Image src="/technocycle-logo-light.png" alt="Technocycle" width={56} height={56} priority className="mb-6 dark:hidden" />
          <Image src="/technocycle-logo-dark.png" alt="Technocycle" width={56} height={56} priority className="mb-6 hidden dark:block" />

          <h1 className="text-title font-semibold text-ink">Sign in to TechnoSys</h1>
          <p className="mt-1 mb-8 text-small text-ink-2">For Technocycle office staff: CEO, HR and Service Dept.</p>

          {message && (
            <p role="alert" className="mb-5 flex items-start gap-2 rounded-control bg-danger-soft p-3 text-small text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {message}
            </p>
          )}

          <LoginForm />

          <div className="mt-8 flex flex-col gap-1">
            <LoginPolicyModal />
            <p className="text-caption text-ink-3">Office staff only. Sign-ins are logged (Data Privacy Act, RA 10173).</p>
          </div>
        </div>
      </main>
      <aside className="hidden min-h-[calc(100vh-2rem)] lg:block">
        <LoginShowcase />
      </aside>
    </div>
  )
}
