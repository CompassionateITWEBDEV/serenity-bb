export type TreatmentPhase =
  | "Initial Assessment"
  | "Detoxification Phase"
  | "Individual Therapy"
  | "Group Therapy"
  | "Relapse Prevention"

export type PhaseStatus = "Completed" | "In Progress" | "Upcoming"

export type AppointmentStatus = "Confirmed" | "Pending" | "Cancelled"

export type Overview = {
  patientId: string
  // Stats (top cards)
  stats: {
    daysInProgram: number
    sessionsCompleted: number
    goalsAchieved: number
    goalsTotal: number
    progressPercent: number // 0..100
  }
  // Treatment timeline
  phases: Array<{
    name: TreatmentPhase
    description: string
    startedAt?: string
    status: PhaseStatus
    progressPercent: number // 0..100
  }>
  // Appointments
  appointments: Array<{
    id: string
    title: string
    provider?: string
    at: string // ISO
    location?: string
    status: AppointmentStatus
  }>
  // Wellness (daily)
  wellness: {
    mood: number // 1..10
    sleep: number // hours 0..12
    hydration: number // glasses 0..12
    stress: number // 1..10 (lower is better)
  }
  recentActivity: Array<{ id: string; at: string; text: string }>
  updatedAt: string
}

export function zeroOverview(patientId: string): Overview {
  const now = new Date().toISOString()
  return {
    patientId,
    stats: {
      daysInProgram: 0,
      sessionsCompleted: 0,
      goalsAchieved: 0,
      goalsTotal: 10,
      progressPercent: 0,
    },
    phases: [
      { name: "Initial Assessment", description: "Comprehensive evaluation and treatment planning", status: "Upcoming", progressPercent: 0 },
      { name: "Detoxification Phase", description: "Safe withdrawal management and stabilization", status: "Upcoming", progressPercent: 0 },
      { name: "Individual Therapy", description: "Weekly one-on-one counseling sessions", status: "Upcoming", progressPercent: 0 },
      { name: "Group Therapy", description: "Peer support and group counseling", status: "Upcoming", progressPercent: 0 },
      { name: "Relapse Prevention", description: "Coping strategies and long-term planning", status: "Upcoming", progressPercent: 0 },
    ],
    appointments: [],
    wellness: { mood: 5, sleep: 0, hydration: 0, stress: 5 },
    recentActivity: [],
    updatedAt: now,
  }
}

const store = new Map<string, Overview>()
type Subscriber = (ov: Overview) => void
const subs = new Map<string, Set<Subscriber>>()

export function findOverview(patientId: string) {
  return store.get(patientId)
}

export function upsertOverview(ov: Overview) {
  store.set(ov.patientId, ov)
  subs.get(ov.patientId)?.forEach((fn) => fn(ov))
}

export function ensureOverview(patientId: string): { overview: Overview; isNew: boolean } {
  const existing = findOverview(patientId)
  if (existing) return { overview: existing, isNew: false }
  const created = zeroOverview(patientId) // WHY: new patient → clean slate
  upsertOverview(created)
  return { overview: created, isNew: true }
}

export function subscribe(patientId: string, fn: Subscriber) {
  if (!subs.has(patientId)) subs.set(patientId, new Set())
  subs.get(patientId)!.add(fn)
  return () => subs.get(patientId)!.delete(fn)
}

// Demo: seed data to simulate an "existing" patient (call once after signup import).
export function seedDemoExisting(patientId: string) {
  const now = new Date()
  const ov: Overview = {
    patientId,
    stats: {
      daysInProgram: 45,
      sessionsCompleted: 12,
      goalsAchieved: 8,
      goalsTotal: 10,
      progressPercent: 85,
    },
    phases: [
      { name: "Initial Assessment", description: "Comprehensive evaluation and treatment planning", status: "Completed", progressPercent: 100, startedAt: isoDaysAgo(45) },
      { name: "Detoxification Phase", description: "Safe withdrawal management and stabilization", status: "Completed", progressPercent: 100, startedAt: isoDaysAgo(40) },
      { name: "Individual Therapy", description: "Weekly one-on-one counseling sessions", status: "In Progress", progressPercent: 75, startedAt: isoDaysAgo(30) },
      { name: "Group Therapy", description: "Peer support and group counseling", status: "In Progress", progressPercent: 60, startedAt: isoDaysAgo(20) },
      { name: "Relapse Prevention", description: "Coping strategies and long-term planning", status: "Upcoming", progressPercent: 0 },
    ],
    appointments: [
      {
        id: "a1",
        title: "Individual Therapy Session",
        provider: "Dr. Sarah Johnson",
        at: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0).toISOString(),
        location: "Room 205",
        status: "Confirmed",
      },
      {
        id: "a2",
        title: "Group Therapy",
        provider: "Dr. Michael Chen",
        at: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 10, 0).toISOString(),
        location: "Room 306",
        status: "Confirmed",
      },
    ],
    wellness: { mood: 8, sleep: 7, hydration: 6, stress: 3 },
    recentActivity: [
      { id: "r1", at: isoDaysAgo(1), text: "Completed daily check-in" },
      { id: "r2", at: isoDaysAgo(2), text: "Attended group therapy" },
    ],
    updatedAt: new Date().toISOString(),
  }
  upsertOverview(ov)
}

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
