export type AssignmentType = 'on_site' | 'deployment' | 'office_duty';

export interface CrewAssignmentItem {
  id: string;
  schedule_id: string;
  technician_id: string;
  assignment_role: 'lead' | 'crew' | 'driver' | 'helper';
  joined_at: string;
  released_at?: string | null;
  status: 'active' | 'released' | 'reassigned';
  notes?: string | null;
  profiles?: {
    full_name: string;
    role: string;
    technician_level?: string;
    is_driver?: boolean;
    contact_number?: string;
  } | null;
}

export interface ScheduleItem {
  id: string;
  technician_id: string | null;
  senior_partner_id?: string | null;
  client_name: string;
  location: string;
  start_time: string;
  end_time: string | null;
  attendance_mode: string;
  attendance_tracking_mode?: string;
  geofence_lat?: number | null;
  geofence_lon?: number | null;
  geofence_radius?: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'unassigned';
  cancellation_reason?: string | null;
  assignment_type?: AssignmentType;
  project_name?: string | null;
  target_review_date?: string | null;
  reporting_instruction?: 'direct_to_site' | 'via_pacita_hq';
  profiles?: {
    full_name: string;
    role: string;
    technician_level?: string;
    is_driver?: boolean;
  } | null;
  senior_partner?: {
    full_name: string;
  } | null;
  schedule_crew_assignments?: CrewAssignmentItem[];
  schedule_casual_helpers?: Array<{
    id: string;
    casual_helper_id: string;
    casual_helpers?: {
      id: string;
      full_name: string;
      contact_number?: string;
    };
  }>;
}

export interface ProfileItem {
  id: string;
  full_name: string;
  role: 'technician' | 'helper';
  lifecycle_status: string;
  technician_level: 'senior' | 'technician' | 'helper';
  is_driver?: boolean;
}

export interface CasualHelperItem {
  id: string;
  full_name: string;
  contact_number: string;
  emergency_contact?: string;
  notes?: string;
  status?: string;
  created_at?: string;
}

export interface LeaveItem {
  technician_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface ScheduleChangeLogItem {
  id: string;
  schedule_id: string;
  changed_by?: string | null;
  action_type: 'created' | 'rescheduled' | 'reassigned' | 'crew_added' | 'crew_released' | 'cancelled' | 'details_updated';
  previous_payload?: Record<string, unknown> | null;
  new_payload?: Record<string, unknown> | null;
  reason?: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
}

export type HorizonGranularity = 'day' | 'week' | 'month' | 'past';
export type HorizonMode = 'today' | 'upcoming_7' | 'unassigned' | 'custom' | HorizonGranularity;
export type ViewMode = 'table' | 'timeline' | 'calendar';
export type AssignmentTypeFilter = 'all' | AssignmentType;

// Timezone-safe local date utilities avoiding UTC drift
export const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (dateStrOrObj: string | Date): string => {
  try {
    const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return String(dateStrOrObj);
  }
};
