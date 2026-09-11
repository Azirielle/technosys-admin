"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function TopTabs({ tabs }: { tabs: { label: string, href: string }[] }) {
  const pathname = usePathname()

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 inline-flex rounded-xl mb-6 shadow-2xs border border-zinc-200 dark:border-zinc-700">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={true}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              isActive 
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs border border-zinc-200/80 dark:border-zinc-700" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/60"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
