import { getPublicPolicy } from '@/app/actions/policies'
import PublicPolicyView from '@/components/policies/PublicPolicyView'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const { success, policy } = await getPublicPolicy('terms_of_service')

  if (!success || !policy) {
    notFound()
  }

  return <PublicPolicyView policy={policy} />
}
