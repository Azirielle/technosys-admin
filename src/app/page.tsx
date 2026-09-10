import type { Metadata } from 'next'
import GatewayPortal from '@/components/gateway-portal'

export const metadata: Metadata = {
  title: 'TechnoCycle Admin — Access Portal',
  description: 'Select your role to access the TechnoCycle internal system.',
}

export default function GatewayPage() {
  return <GatewayPortal />
}
