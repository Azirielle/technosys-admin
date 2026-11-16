// CertificateLink: opens a leave's medical certificate. The "leaves" bucket is private, so it asks Supabase for a
// link that works for 5 minutes (only HR and the CEO are allowed to get one) and opens it in a new tab.
'use client'

import { useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, useToast } from '@/components/ui'

/** Older requests saved a full public link; newer ones save the path in the bucket. */
function pathOf(attachment: string) {
  const marker = '/leaves/'
  return attachment.startsWith('http') ? attachment.slice(attachment.indexOf(marker) + marker.length) : attachment
}

export function CertificateLink({ attachment }: { attachment: string }) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [opening, setOpening] = useState(false)

  async function open() {
    // Open the tab first (browsers block pop-ups opened after a wait), then point it at the signed link.
    const tab = window.open('', '_blank')
    setOpening(true)
    const { data, error } = await supabase.storage.from('leaves').createSignedUrl(pathOf(attachment), 300)
    setOpening(false)
    if (error || !data) {
      tab?.close()
      toast.error("Couldn't open the certificate. It may have been removed.")
      return
    }
    if (tab) tab.location.href = data.signedUrl
    else window.location.assign(data.signedUrl)
  }

  return (
    <Button variant="ghost" size="sm" className="w-fit" iconRight={ExternalLink} loading={opening} onClick={open}>
      View medical certificate
    </Button>
  )
}
