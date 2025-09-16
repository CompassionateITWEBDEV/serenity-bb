'use client';

import { z } from 'zod';

export const PatientSignupSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  phone: z.string().optional().nullable(),
  date_of_birth: z
    .string()
    .optional()
    .nullable(), // accepts "YYYY-MM-DD" or "MM/DD/YYYY" (server normalizes)
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  treatment_type: z.string().optional().nullable(),
});
export type PatientSignup = z.infer<typeof PatientSignupSchema>;

export type SignupSuccess = {
  user_id: string;
  profile: Record<string, unknown>;
};
export type SignupError =
  | { fieldErrors: Record<string, string[]>; message?: string }
  | { message: string };

export async function signUpPatient(
  payload: PatientSignup,
): Promise<{ ok: true; data: SignupSuccess } | { ok: false; error: SignupError; status: number }> {
  // local validation to fail-fast before network
  const parsed = PatientSignupSchema.safeParse(payload);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      status: 400,
      error: { fieldErrors: flat.fieldErrors, message: 'Invalid signup data' },
    };
  }

  const res = await fetch('/api/patients/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // server may return zod issues or generic error
    if (body?.issues?.fieldErrors) {
      return { ok: false, status: res.status, error: { fieldErrors: body.issues.fieldErrors, message: body.error } };
    }
    return { ok: false, status: res.status, error: { message: body?.error ?? 'Signup failed' } };
  }
  return { ok: true, data: body as SignupSuccess };
}
