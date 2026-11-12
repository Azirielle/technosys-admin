'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HRRootRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/hr/leaves')
  }, [router])

  return (
    <div className="flex items-center justify-center h-full text-xs text-[#8E8D9A] bg-[#FAF9FB] dark:bg-[#121215]">
      Navigating to HR Workspace...
    </div>
  )
}
