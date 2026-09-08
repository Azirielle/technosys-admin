import BroadcasterClient from '@/components/dashboard/BroadcasterClient'

export default function CEOAnnouncementsPage() {
  return (
    <BroadcasterClient 
      currentRole="ceo" 
      adminName="Carlos CEO" 
      adminRoleLabel="Chief Executive Officer" 
    />
  )
}
