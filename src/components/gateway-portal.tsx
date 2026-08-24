'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const ease = [0.32, 0.72, 0, 1] as const

export default function GatewayPortal() {
  const router = useRouter()

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row">

      {/* ── LEFT PANEL — Brand Identity (60%) ─────────────────────── */}
      <motion.div
        className="relative flex-none md:w-[60%] flex flex-col items-center justify-center px-10 py-16 md:py-0 overflow-hidden"
        style={{ background: 'oklch(0.14 0.03 160)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease }}
      >
        {/* Subtle CSS geometric grid texture */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px),
              linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />

        {/* Radial vignette to soften grid edges */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, oklch(0.14 0.03 160) 100%)',
          }}
          aria-hidden="true"
        />

        {/* Faint accent glow — bottom right */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, oklch(0.55 0.18 160 / 0.12) 0%, transparent 70%)',
            transform: 'translate(30%, 30%)',
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <motion.div
          className="relative z-10 flex flex-col items-center text-center max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease, delay: 0.1 }}
        >
          {/* Logo */}
          <div className="mb-8 p-3 rounded-2xl bg-white/8 ring-1 ring-white/10">
            <Image
              src="/logo.png"
              alt="TechnoSys"
              width={64}
              height={64}
              className="rounded-xl"
              priority
            />
          </div>

          {/* Wordmark */}
          <h1
            className="text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.1]"
            style={{ color: 'oklch(0.97 0.005 160)' }}
          >
            TechnoSys
          </h1>

          {/* Divider */}
          <div
            className="my-5 w-10 h-px"
            style={{ background: 'oklch(0.55 0.18 160)' }}
          />

          {/* Tagline */}
          <p
            className="text-[0.9375rem] leading-relaxed font-normal"
            style={{ color: 'oklch(0.72 0.04 160)' }}
          >
            Field Operations &amp; HR Management
          </p>

          {/* System label */}
          <p
            className="mt-3 text-[0.75rem] tracking-[0.12em] uppercase font-medium"
            style={{ color: 'oklch(0.48 0.06 160)' }}
          >
            Internal System
          </p>
        </motion.div>
      </motion.div>

      {/* ── RIGHT PANEL — Role Selector (40%) ────────────────────── */}
      <motion.div
        className="flex-none md:w-[40%] flex flex-col items-center justify-center px-8 py-14 md:py-0"
        style={{ background: 'oklch(0.985 0.003 160)' }}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.18 }}
      >
        <div className="w-full max-w-[320px] flex flex-col gap-0">

          {/* Greeting */}
          <div className="mb-8">
            <h2
              className="text-2xl font-semibold tracking-[-0.02em]"
              style={{ color: 'oklch(0.15 0 0)' }}
            >
              Welcome back.
            </h2>
            <p
              className="mt-1.5 text-[0.875rem]"
              style={{ color: 'oklch(0.52 0 0)' }}
            >
              Where are you accessing from?
            </p>
          </div>

          {/* ── PRIMARY: Technician ──────────────────── */}
          <motion.button
            onClick={() => router.push('/login?next=/technician')}
            className="group w-full flex items-center justify-between gap-3 rounded-xl px-5 py-4 font-medium text-[0.9375rem] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer"
            style={{
              background: 'oklch(0.45 0.16 160)',
              color: 'oklch(0.97 0.01 160)',
              boxShadow: '0 1px 2px oklch(0 0 0 / 0.08), 0 0 0 1px oklch(0.38 0.14 160)',
            }}
            whileHover={{
              scale: 1.015,
              background: 'oklch(0.40 0.17 160)',
            } as Parameters<typeof motion.button>[0]['whileHover']}
            whileTap={{ scale: 0.985 } as Parameters<typeof motion.button>[0]['whileTap']}
            transition={{ duration: 0.18, ease }}
            aria-label="Access as Technician or Employee"
          >
            <span className="flex items-center gap-3">
              {/* Phone icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 shrink-0"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15.75h3"
                />
              </svg>
              <span>
                Technician
                <span
                  className="block text-[0.75rem] font-normal mt-0.5"
                  style={{ color: 'oklch(0.82 0.06 160)' }}
                >
                  App download &amp; attendance
                </span>
              </span>
            </span>

            {/* Arrow */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </motion.button>

          {/* Divider with label */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: 'oklch(0.90 0 0)' }} />
            <span
              className="text-[0.6875rem] tracking-[0.08em] uppercase"
              style={{ color: 'oklch(0.68 0 0)' }}
            >
              or
            </span>
            <div className="flex-1 h-px" style={{ background: 'oklch(0.90 0 0)' }} />
          </div>

          {/* ── SECONDARY: Admin ──────────────────────── */}
          <motion.button
            onClick={() => router.push('/login')}
            className="group w-full flex items-center justify-between gap-3 rounded-xl px-5 py-4 font-medium text-[0.9375rem] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer"
            style={{
              background: 'rgba(0,0,0,0)',
              color: 'oklch(0.30 0 0)',
              boxShadow: '0 0 0 1px oklch(0.82 0 0)',
            }}
            whileHover={{
              background: 'oklch(0.96 0.004 160)',
              boxShadow: '0 0 0 1px oklch(0.72 0.04 160)',
            } as Parameters<typeof motion.button>[0]['whileHover']}
            whileTap={{ scale: 0.985 } as Parameters<typeof motion.button>[0]['whileTap']}
            transition={{ duration: 0.18, ease }}
            aria-label="Access as Admin"
          >
            <span className="flex items-center gap-3">
              {/* Shield icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 shrink-0"
                style={{ color: 'oklch(0.52 0 0)' }}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
              <span>
                Admin
                <span
                  className="block text-[0.75rem] font-normal mt-0.5"
                  style={{ color: 'oklch(0.60 0 0)' }}
                >
                  Dashboard &amp; system config
                </span>
              </span>
            </span>

            {/* Arrow */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: 'oklch(0.60 0 0)' }}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </motion.button>

          {/* Terms */}
          <p
            className="mt-8 text-center text-[0.75rem] leading-relaxed"
            style={{ color: 'oklch(0.64 0 0)' }}
          >
            By continuing, you agree to TechnoSys&apos;s{' '}
            <span style={{ color: 'oklch(0.45 0.14 160)' }}>Terms of Use</span>
            {' '}and{' '}
            <span style={{ color: 'oklch(0.45 0.14 160)' }}>Privacy Policy</span>.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
