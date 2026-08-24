"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function TopTabs({ tabs }: { tabs: { label: string, href: string }[] }) {
  const pathname = usePathname()

  return (
    <div className="bg-slate-100 p-1 inline-flex rounded-lg mb-6 shadow-sm border border-slate-200">
      {tabs.map((tab) => {
        // Exact match or active sub-route logic
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={true}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              isActive 
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
