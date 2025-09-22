export type MilestoneStatus = "completed" | "in-progress" | "upcoming"

export interface Milestone {
  id: string
  patient_id: string
  title: string
  description: string | null
  status: MilestoneStatus
  date: string | null
  progress: number | null
  sort_order: number | null
  created_at: string
  updated_at: string | null
}

export interface PatientProfile {
  id: string
  full_name: string | null
  onboarded_at: string | null
  is_active: boolean | null
}
