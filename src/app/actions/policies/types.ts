export type PolicyCategory = 
  | 'employment' 
  | 'compensation' 
  | 'attendance' 
  | 'safety' 
  | 'inventory' 
  | 'conduct' 
  | 'legal' 
  | 'executive' 
  | 'field_ops' 
  | 'hr_attendance'

export type PolicyLifecycleStatus = 'draft' | 'under_review' | 'active' | 'archived'

export interface CompanyPolicy {
  id: string
  title: string
  category: PolicyCategory
  version: string
  effective_date: string
  target_audience: 'all' | 'technician' | 'admin'
  summary: string
  content_markdown: string
  is_mandatory: boolean
  is_active: boolean
  status: PolicyLifecycleStatus
  parent_policy_id?: string | null
  review_notes?: string | null
  published_at?: string | null
  archived_at?: string | null
  created_by?: string | null
  reviewed_by?: string | null
  is_material_change?: boolean
  content_hash?: string | null
  created_at: string
  updated_at: string
}

export interface PolicyAcknowledgmentItem {
  id: string
  user_id: string
  policy_id: string
  policy_version: string
  acknowledged_at: string
  ip_address: string | null
  user_agent: string | null
  user?: {
    id?: string
    full_name: string
    role: string
    technician_level: string | null
    contact_number: string | null
  }
}
