import { AnnouncementsBoard } from '@/components/announcements/AnnouncementsBoard'
import { getCurrentUser } from '@/lib/current-user'

export default async function HRAnnouncementsPage() {
  const me = await getCurrentUser()
  return (
    <AnnouncementsBoard
      currentRole="hr"
      adminName={me?.name || 'Office'}
      adminRoleLabel={me?.roleLabel || ''}
    />
  )
}
