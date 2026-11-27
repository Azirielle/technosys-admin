// attachmentUrl: ticket photos and files live in private storage (28 Nov), so the admin shows them through a link
// that works for an hour. Newer messages save the path in "ticket_attachments"; older ones saved a full public link.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { attachmentPlace } from './types'

/** A link that opens the attachment now (null while it loads, or if the file is gone). */
export function useAttachmentUrl(saved?: string | null): string | null {
  const supabase = useMemo(() => createClient(), [])
  const [signed, setSigned] = useState<{ saved: string; url: string | null } | null>(null)
  const place = saved ? attachmentPlace(saved) : null

  useEffect(() => {
    if (!saved || !place) return
    let alive = true
    supabase.storage.from(place.bucket).createSignedUrl(place.path, 3600).then(({ data }) => {
      if (alive) setSigned({ saved, url: data?.signedUrl ?? null })
    })
    return () => { alive = false }
  }, [saved, place?.bucket, place?.path, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!saved) return null
  if (!place) return saved
  return signed?.saved === saved ? signed.url : null
}
