import BroadcasterClient from '@/components/dashboard/BroadcasterClient'
import { getCurrentUser } from '@/lib/current-user'

export default async function CEOAnnouncementsPage() {
  const me = await getCurrentUser()
  return (
    <BroadcasterClient
      currentRole="ceo"
      adminName={me?.name || 'Office'}
      adminRoleLabel={me?.roleLabel || ''}
    />
  )
}
