export type MilestoneStatus = "completed" | "in-progress" | "upcoming"

export interface Milestone {
  id: string
  patient_id: string
  title: string
  description: string | null
  status: MilestoneStatus
  date: string | null // store ISO or human text
  progress: number | null // 0..100
  sort_order: number | null
  created_at: string
  updated_at: string | null
}

export interface PatientProfile {
  id: string // references auth.users.id
  full_name: string | null
  onboarded_at: string | null
  is_active: boolean | null
}
