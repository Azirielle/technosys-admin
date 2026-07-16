'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const ease = [0.32, 0.72, 0, 1] as const

const roles = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Dashboard, payroll, and system configuration',
    href: '/login',
    hoverBg: 'hover:bg-[oklch(0.95_0.04_160)]',
    activeBg: 'active:bg-[oklch(0.92_0.06_160)]',
    iconBg: 'bg-[oklch(0.92_0.06_160)]',
    iconColor: 'text-[oklch(0.45_0.15_160)]',
    accentColor: 'oklch(0.45_0.15_160)',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.25}
        stroke="currentColor"
        className="w-8 h-8"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
      </svg>
    ),
  },
  {
    id: 'technician',
    label: 'Technician',
    description: 'App download, attendance, and field tools',
    href: '/login?next=/technician',
    hoverBg: 'hover:bg-[oklch(0.95_0.03_240)]',
    activeBg: 'active:bg-[oklch(0.92_0.05_240)]',
    iconBg: 'bg-[oklch(0.92_0.05_240)]',
    iconColor: 'text-[oklch(0.40_0.14_240)]',
    accentColor: 'oklch(0.40_0.14_240)',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.25}
        stroke="currentColor"
        className="w-8 h-8"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15.75h3" />
      </svg>
    ),
  },
]

export default function GatewayPortal() {
  const router = useRouter()

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[oklch(0.975_0.004_240)] select-none">

      {/* ── Logo block ─────────────────────────────── */}
      <motion.header
        className="flex flex-col items-center pt-14 pb-10 px-6"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <Image
          src="/logo.png"
          alt="TechnoSys"
          width={56}
          height={56}
          className="mb-5 rounded-xl"
          priority
        />
        <h1 className="text-[1.125rem] font-semibold tracking-[-0.01em] text-[oklch(0.18_0_0)]">
          TechnoSys
        </h1>
        <p className="mt-1 text-[0.8125rem] text-[oklch(0.52_0_0)] font-normal">
          Select your access portal to continue
        </p>
      </motion.header>

      {/* ── Divider ──────────────────────────────────── */}
      <div className="w-full h-px bg-[oklch(0.88_0.004_240)]" />

      {/* ── Split panels ─────────────────────────────── */}
      <div className="flex flex-1 flex-col md:flex-row">
        {roles.map((role, i) => (
          <motion.button
            key={role.id}
            onClick={() => router.push(role.href)}
            className={[
              'group relative flex-1 flex flex-col items-center justify-center gap-5',
              'px-8 py-16 md:py-0',
              'transition-colors duration-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'cursor-pointer text-left',
              role.hoverBg,
              role.activeBg,
            ].join(' ')}
            style={{ '--accent': role.accentColor } as React.CSSProperties}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease, delay: 0.18 + i * 0.12 }}
            aria-label={`Access as ${role.label}`}
          >
            {/* Icon */}
            <div
              className={[
                'w-14 h-14 rounded-2xl flex items-center justify-center',
                'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'group-hover:scale-105',
                role.iconBg,
                role.iconColor,
              ].join(' ')}
            >
              {role.icon}
            </div>

            {/* Label + description */}
            <div className="text-center max-w-[22ch]">
              <p className="text-[1.25rem] font-semibold tracking-[-0.015em] text-[oklch(0.15_0_0)]">
                {role.label}
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[oklch(0.50_0_0)]">
                {role.description}
              </p>
            </div>

            {/* Chevron arrow — slides in on hover */}
            <motion.span
              className="absolute bottom-8 right-8 text-[oklch(0.60_0_0)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </motion.span>
          </motion.button>
        ))}

        {/* ── Vertical divider between panels (desktop) ─ */}
        <div className="hidden md:block w-px bg-[oklch(0.88_0.004_240)] self-stretch" />

        {/* ── Horizontal divider between panels (mobile) ─ */}
        <div className="block md:hidden w-full h-px bg-[oklch(0.88_0.004_240)]" />
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      <motion.footer
        className="flex items-center justify-center py-5 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
      >
        <p className="text-[0.75rem] text-[oklch(0.68_0_0)]">
          © {new Date().getFullYear()} TechnoSys · Internal System
        </p>
      </motion.footer>
    </div>
  )
}
