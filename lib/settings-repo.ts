import { Settings, SettingsSchema } from "@/lib/settings-schema"

type Store = Map<string, Settings>
const store: Store = new Map()

const DEFAULTS: Settings = SettingsSchema.parse({
  profile: {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@email.com",
    phone: "+1 (555) 123-4567",
    dateOfBirth: "1990-01-01",
    emergencyContact: "Jane Doe - (555) 987-6543",
    bio: "Patient at Serenity Rehabilitation Center focusing on recovery and wellness.",
    photoUrl: null,
  },
  notifications: {
    appointments: true,
    medications: true,
    progress: false,
    messages: true,
    emergencyAlerts: true,
    methods: { email: true, sms: true, push: true },
  },
  privacy: {
    shareProgress: false,
    allowResearch: true,
    dataCollection: true,
  },
  preferences: {
    language: "en",
    timezone: "est",
    theme: "light",
    dateFormat: "mdy",
    autoSave: true,
    soundEffects: true,
    animations: true,
  },
})

// Deep merge utility (simple & predictable)
function deepMerge<T>(target: T, patch: Partial<T>): T {
  const output: any = Array.isArray(target) ? [...(target as any)] : { ...(target as any) }
  for (const [k, v] of Object.entries(patch as any)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      output[k] = deepMerge((target as any)[k] ?? {}, v)
    } else {
      output[k] = v
    }
  }
  return output
}

async function get(userId: string): Promise<Settings> {
  if (!store.has(userId)) {
    store.set(userId, DEFAULTS)
  }
  return store.get(userId)!
}

async function update(userId: string, partial: Partial<Settings>): Promise<Settings> {
  const current = await get(userId)
  const merged = deepMerge(current, partial)
  const validated = SettingsSchema.parse(merged) // keep data sound
  store.set(userId, validated)
  return validated
}
