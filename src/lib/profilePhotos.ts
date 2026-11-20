// profilePhotos: everyone's profile photo by name, loaded once per page load, so every <Avatar> in the admin shows
// the photo a technician set in the app (most lists only carry the name).
// shortcut: keyed by full name (all names are unique today); a new photo shows after a page reload. Pass `src` where the id is known.
import { createClient } from '@/lib/supabase/client'

let photos: Promise<Map<string, string>> | null = null

export function loadProfilePhotos(): Promise<Map<string, string>> {
  photos ??= Promise.resolve(
    createClient().from('profiles').select('full_name, avatar_url').not('avatar_url', 'is', null),
  ).then(({ data }) => new Map((data ?? []).map((p) => [p.full_name.trim().toLowerCase(), p.avatar_url as string])))
    .catch(() => new Map<string, string>())
  return photos
}
