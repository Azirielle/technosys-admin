import { AnnouncementsBoard } from '@/components/announcements/AnnouncementsBoard'
import { getCurrentUser } from '@/lib/current-user'

export default async function CoordinatorAnnouncementsPage() {
  const me = await getCurrentUser()
  return (
    <AnnouncementsBoard
      currentRole="coordinator"
      adminName={me?.name || 'Office'}
      adminRoleLabel={me?.roleLabel || ''}
    />
  )
}
