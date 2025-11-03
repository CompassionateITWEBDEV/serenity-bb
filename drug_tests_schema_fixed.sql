-- Fixed drug_tests table schema with metadata column
CREATE TABLE IF NOT EXISTS public.drug_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  scheduled_for timestamp with time zone NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb, -- Added: metadata column for storing additional test information
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT drug_tests_pkey PRIMARY KEY (id),
  CONSTRAINT drug_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES staff (user_id) ON DELETE SET NULL,
  CONSTRAINT drug_tests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients (user_id) ON DELETE CASCADE,
  CONSTRAINT drug_tests_status_check CHECK (
    (
      lower(status) = ANY (
        ARRAY[
          'pending'::text,
          'completed'::text,
          'missed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drug_tests_patient 
  ON public.drug_tests USING btree (patient_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_drug_tests_status 
  ON public.drug_tests USING btree (lower(status)) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_drug_tests_scheduled_for 
  ON public.drug_tests USING btree (scheduled_for) 
  TABLESPACE pg_default;

-- Metadata index for common queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_drug_tests_metadata 
  ON public.drug_tests USING gin (metadata) 
  TABLESPACE pg_default;

-- Triggers
CREATE TRIGGER trg_drug_tests_updated_at 
  BEFORE UPDATE ON drug_tests 
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_drug_tests_created_by 
  BEFORE INSERT ON drug_tests 
  FOR EACH ROW
  EXECUTE FUNCTION set_drug_tests_created_by();

-- If table already exists, add the metadata column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drug_tests' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.drug_tests 
    ADD COLUMN metadata jsonb NULL DEFAULT '{}'::jsonb;
    
    -- Create GIN index for metadata if it doesn't exist
    CREATE INDEX IF NOT EXISTS idx_drug_tests_metadata 
      ON public.drug_tests USING gin (metadata) 
      TABLESPACE pg_default;
  END IF;
END $$;

