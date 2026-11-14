import BroadcasterClient from '@/components/dashboard/BroadcasterClient'
import { getCurrentUser } from '@/lib/current-user'

export default async function CoordinatorAnnouncementsPage() {
  const me = await getCurrentUser()
  return (
    <BroadcasterClient
      currentRole="coordinator"
      adminName={me?.name || 'Office'}
      adminRoleLabel={me?.roleLabel || ''}
    />
  )
}
