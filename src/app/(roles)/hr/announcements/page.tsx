import BroadcasterClient from '@/components/dashboard/BroadcasterClient'
import { getCurrentUser } from '@/lib/current-user'

export default async function HRAnnouncementsPage() {
  const me = await getCurrentUser()
  return (
    <BroadcasterClient
      currentRole="hr"
      adminName={me?.name || 'Office'}
      adminRoleLabel={me?.roleLabel || ''}
    />
  )
}
