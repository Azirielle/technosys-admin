import type { Metadata } from 'next'
import GatewayPortal from '@/components/gateway-portal'

export const metadata: Metadata = {
  title: 'TechnoSys — Access Portal',
  description: 'Select your role to access the TechnoSys internal system.',
}

export default function GatewayPage() {
  return <GatewayPortal />
}
