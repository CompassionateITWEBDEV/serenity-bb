-- Connect staff to verified clinicians
-- 1) Ensure staff table has safe read access
-- 2) Create a view that aggregates verification stats per staff

-- Enable Row Level Security on staff if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff'
  ) THEN
    RAISE NOTICE 'Table public.staff not found; skipping RLS enable.';
  ELSE
    EXECUTE 'ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Allow authenticated users to read active staff only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff'
  ) THEN
    DROP POLICY IF EXISTS "Read active staff" ON public.staff;
    CREATE POLICY "Read active staff" ON public.staff
      FOR SELECT USING (auth.uid() IS NOT NULL AND active = true);

    DROP POLICY IF EXISTS "Update own staff profile" ON public.staff;
    CREATE POLICY "Update own staff profile" ON public.staff
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create a view with verified clinicians and stats
-- Requires staff_verifications table
CREATE OR REPLACE VIEW public.verified_clinicians AS
SELECT
  s.user_id                         AS id,
  s.email,
  s.first_name,
  s.last_name,
  s.title,
  s.department,
  s.role,
  s.phone,
  s.avatar_url,
  COUNT(v.id)                       AS total_verifications,
  NULLIF(ROUND(AVG(NULLIF(v.rating, 0))::numeric, 1), 0)::float AS average_rating
FROM public.staff s
LEFT JOIN public.staff_verifications v
  ON v.staff_id = s.user_id
WHERE s.active = true
GROUP BY s.user_id, s.email, s.first_name, s.last_name, s.title, s.department, s.role, s.phone, s.avatar_url;

-- Helpful sample inserts to verify the link (replace IDs!)
-- insert into public.staff_verifications (staff_id, patient_id, rating, comment)
-- values ('<staff_user_id>', '<patient_user_id>', 5, 'Verified');


