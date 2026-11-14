import { AnnouncementsBoard } from '@/components/announcements/AnnouncementsBoard'
import { getCurrentUser } from '@/lib/current-user'

export default async function CEOAnnouncementsPage() {
  const me = await getCurrentUser()
  return (
    <AnnouncementsBoard
      currentRole="ceo"
      adminName={me?.name || 'Office'}
      adminRoleLabel={me?.roleLabel || ''}
    />
  )
}
