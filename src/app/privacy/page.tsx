import { getPublicPolicy } from '@/app/actions/policies'
import PublicPolicyView from '@/components/policies/PublicPolicyView'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const { success, policy } = await getPublicPolicy('privacy_policy')

  if (!success || !policy) {
    notFound()
  }

  return <PublicPolicyView policy={policy} />
}
