-- Connect patients to staff-facing Patient Verification UI
-- 1) Ensure RLS is enabled on public.patients
-- 2) Add safe policies so staff can list patients; patients can read/update their own row
-- 3) Provide a view with optional verification stats

-- Enable Row Level Security on patients if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients'
  ) THEN
    EXECUTE 'ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY';
  ELSE
    RAISE NOTICE 'Table public.patients not found; skipping RLS enable.';
  END IF;
END $$;

-- Policies: Patients read/update own; Staff can read all
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients'
  ) THEN
    -- Drop existing to avoid duplicates
    DROP POLICY IF EXISTS "Patients can read own row" ON public.patients;
    DROP POLICY IF EXISTS "Patients can update own row" ON public.patients;
    DROP POLICY IF EXISTS "Staff can read all patients" ON public.patients;

    -- Patient self-access
    CREATE POLICY "Patients can read own row" ON public.patients
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Patients can update own row" ON public.patients
      FOR UPDATE USING (auth.uid() = user_id);

    -- Staff listing access: any authenticated user who exists in public.staff and is active
    CREATE POLICY "Staff can read all patients" ON public.patients
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.staff s
          WHERE s.user_id = auth.uid()
          AND s.active = true
        )
      );
  END IF;
END $$;

-- Optional: View that aggregates verification stats per patient (if patient_verifications table exists)
CREATE OR REPLACE VIEW public.patients_with_verification_stats AS
SELECT
  p.user_id,
  p.full_name,
  p.email,
  p.first_name,
  p.last_name,
  p.avatar,
  p.updated_at,
  COALESCE(COUNT(v.id), 0)                    AS total_verifications,
  NULLIF(ROUND(AVG(NULLIF(v.rating, 0))::numeric, 1), 0)::float AS average_rating,
  MAX(v.verified_at)                          AS last_verified_at
FROM public.patients p
LEFT JOIN public.staff_verifications v
  ON v.patient_id = p.user_id
GROUP BY p.user_id, p.full_name, p.email, p.first_name, p.last_name, p.avatar, p.updated_at;


