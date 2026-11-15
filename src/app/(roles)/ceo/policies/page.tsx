// CEO Policies page: the same board as HR's. HR writes a draft and sends it for review; the CEO approves and publishes it.
import { PoliciesBoard } from '@/components/policies/PoliciesBoard'

export const dynamic = 'force-dynamic'

export default function CEOPoliciesPage() {
  return <PoliciesBoard />
}
