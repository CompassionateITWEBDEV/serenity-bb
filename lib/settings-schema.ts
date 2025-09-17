import { z } from "zod"

export const ProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  emergencyContact: z.string().min(1),
  bio: z.string().default(""),
  photoUrl: z.string().url().optional().nullable(),
})

export const NotificationsSchema = z.object({
  appointments: z.boolean(),
  medications: z.boolean(),
  progress: z.boolean(),
  messages: z.boolean(),
  emergencyAlerts: z.boolean(),
  methods: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }),
})

export const PrivacySchema = z.object({
  shareProgress: z.boolean(),
  allowResearch: z.boolean(),
  dataCollection: z.boolean(),
})

export const PreferencesSchema = z.object({
  language: z.enum(["en", "es", "fr"]),
  timezone: z.enum(["est", "cst", "pst"]),
  theme: z.enum(["light", "dark", "system"]),
  dateFormat: z.enum(["mdy", "dmy", "ymd"]),
  autoSave: z.boolean(),
  soundEffects: z.boolean(),
  animations: z.boolean(),
})

export const SettingsSchema = z.object({
  profile: ProfileSchema,
  notifications: NotificationsSchema,
  privacy: PrivacySchema,
  preferences: PreferencesSchema,
})
export type Settings = z.infer<typeof SettingsSchema>

// Partial (deep) for PATCH
export const SettingsPatchSchema = z.object({
  profile: ProfileSchema.partial().optional(),
  notifications: NotificationsSchema.partial().extend({
    methods: NotificationsSchema.shape.methods.partial().optional(),
  }).optional(),
  privacy: PrivacySchema.partial().optional(),
  preferences: PreferencesSchema.partial().optional(),
}).strict()
