import BroadcasterClient from '@/components/dashboard/BroadcasterClient'

export default function CoordinatorAnnouncementsPage() {
  return (
    <BroadcasterClient 
      currentRole="coordinator" 
      adminName="Andrew Adarayan" 
      adminRoleLabel="Field Operations" 
    />
  )
}
