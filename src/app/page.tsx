import type { Metadata } from 'next'
import GatewayPortal from '@/components/gateway-portal'

export const metadata: Metadata = {
  title: 'Technocycle Admin — Access Portal',
  description: 'Select your role to access the Technocycle internal system.',
}

export default function GatewayPage() {
  return <GatewayPortal />
}
