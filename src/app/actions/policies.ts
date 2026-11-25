"use server"

// Re-export types for backward compatibility
export type {
  PolicyCategory,
  PolicyLifecycleStatus,
  CompanyPolicy,
  PolicyAcknowledgmentItem,
} from './policies/types'

import {
  getPublicPolicy as getPublicPolicyImpl,
  getAllPolicies as getAllPoliciesImpl,
} from './policies/getPolicies'

import {
  createPolicyDraft as createPolicyDraftImpl,
  forkPolicyRevision as forkPolicyRevisionImpl,
  updatePolicyDraft as updatePolicyDraftImpl,
  updateCompanyPolicy as updateCompanyPolicyImpl,
} from './policies/drafts'

import {
  submitPolicyForReview as submitPolicyForReviewImpl,
  requestPolicyChanges as requestPolicyChangesImpl,
  publishPolicy as publishPolicyImpl,
  archivePolicy as archivePolicyImpl,
} from './policies/lifecycle'

import {
  getPolicyAcknowledgments as getPolicyAcknowledgmentsImpl,
  dispatchPolicyReminder as dispatchPolicyReminderImpl,
  acknowledgePolicy as acknowledgePolicyImpl,
} from './policies/signatures'

import type { PolicyCategory } from './policies/types'

// Fetch public policy for unauthenticated /login & gateway portal.
// A new version gets the id "<original id>_rev_<…>" and the original is archived, so look for the
// active policy with the original id or any of its revisions, newest first.
export async function getPublicPolicy(policyId: 'terms_of_service' | 'privacy_policy' | 'executive_governance') {
  return getPublicPolicyImpl(policyId)
}

// Fetch all policies for authenticated / admin users
export async function getAllPolicies() {
  return getAllPoliciesImpl()
}

// Fetch acknowledgments with joined profile records
export async function getPolicyAcknowledgments(policyId?: string) {
  return getPolicyAcknowledgmentsImpl(policyId)
}

// ---------------------------------------------------------------------------
// 4-Stage Lifecycle & Version Forking Server Actions
// ---------------------------------------------------------------------------

// 1. Create a brand new policy draft
export async function createPolicyDraft(formData: {
  title: string
  category: PolicyCategory
  version?: string
  target_audience: 'all' | 'technician' | 'admin'
  summary: string
  content_markdown: string
  is_mandatory: boolean
  effective_date?: string
}) {
  return createPolicyDraftImpl(formData)
}

// 2. Fork an active published policy into a single working draft revision
export async function forkPolicyRevision(policyId: string) {
  return forkPolicyRevisionImpl(policyId)
}

// 3. Update working draft content
export async function updatePolicyDraft(formData: {
  id: string
  title: string
  category: PolicyCategory
  version?: string
  target_audience: 'all' | 'technician' | 'admin'
  summary: string
  content_markdown: string
  is_mandatory: boolean
  effective_date?: string
}) {
  return updatePolicyDraftImpl(formData)
}

// 4. Submit working draft for formal review
export async function submitPolicyForReview(policyId: string, customReviewNotes?: string) {
  return submitPolicyForReviewImpl(policyId, customReviewNotes)
}

// 5. Request revisions / reject policy back to draft
export async function requestPolicyChanges(policyId: string, reviewNotes: string) {
  return requestPolicyChangesImpl(policyId, reviewNotes)
}

// 6. Approve & Publish Policy (Enforces Four-Eyes Principle and Version Supersedure)
export async function publishPolicy(
  policyId: string,
  options: {
    isMaterialChange?: boolean
    effectiveDate?: string
    emergencyImmediate?: boolean
  } = {}
) {
  return publishPolicyImpl(policyId, options)
}

// 7. Archive an active policy
export async function archivePolicy(policyId: string) {
  return archivePolicyImpl(policyId)
}

// 8. Dispatch compliance reminder notice to pending technicians
export async function dispatchPolicyReminder(policyId: string, userIds: string[]) {
  return dispatchPolicyReminderImpl(policyId, userIds)
}

// 9. Backward-compatible direct update helper
export async function updateCompanyPolicy(formData: {
  id: string
  title: string
  category: PolicyCategory
  version: string
  target_audience: 'all' | 'technician' | 'admin'
  summary: string
  content_markdown: string
  is_mandatory: boolean
  is_active: boolean
}) {
  return updateCompanyPolicyImpl(formData)
}

// 10. User Acknowledgment Action (Called from Mobile or Web)
export async function acknowledgePolicy(policyId: string, version: string, ipAddress?: string, userAgent?: string) {
  return acknowledgePolicyImpl(policyId, version, ipAddress, userAgent)
}
