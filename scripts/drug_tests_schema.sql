-- Drug Tests Table Schema
-- This file contains the complete schema for the drug_tests table
-- Last updated: 2025-01-XX

-- Main table definition
CREATE TABLE IF NOT EXISTS public.drug_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  scheduled_for timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT drug_tests_pkey PRIMARY KEY (id),
  CONSTRAINT drug_tests_created_by_fkey FOREIGN KEY (created_by) 
    REFERENCES staff (user_id) ON DELETE SET NULL,
  CONSTRAINT drug_tests_patient_id_fkey FOREIGN KEY (patient_id) 
    REFERENCES patients (user_id) ON DELETE CASCADE,
  CONSTRAINT drug_tests_status_check CHECK (
    lower(status) = ANY (
      ARRAY[
        'pending'::text,
        'completed'::text,
        'missed'::text
      ]
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

CREATE INDEX IF NOT EXISTS idx_drug_tests_metadata 
  ON public.drug_tests USING gin (metadata) 
  TABLESPACE pg_default;

-- Triggers
-- Note: These triggers assume the functions set_updated_at() and set_drug_tests_created_by() exist
CREATE TRIGGER IF NOT EXISTS trg_drug_tests_updated_at 
  BEFORE UPDATE ON drug_tests 
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_set_drug_tests_created_by 
  BEFORE INSERT ON drug_tests 
  FOR EACH ROW
  EXECUTE FUNCTION set_drug_tests_created_by();

-- Comments for documentation
COMMENT ON TABLE public.drug_tests IS 'Stores drug test records for patients';
COMMENT ON COLUMN public.drug_tests.id IS 'Unique identifier for the drug test';
COMMENT ON COLUMN public.drug_tests.patient_id IS 'Reference to patients.user_id - the patient who needs to take the test';
COMMENT ON COLUMN public.drug_tests.created_by IS 'Reference to staff.user_id - the staff member who created the test';
COMMENT ON COLUMN public.drug_tests.status IS 'Status of the test: pending, completed, or missed';
COMMENT ON COLUMN public.drug_tests.scheduled_for IS 'Scheduled date and time for the test (optional)';
COMMENT ON COLUMN public.drug_tests.created_at IS 'Timestamp when the test record was created';
COMMENT ON COLUMN public.drug_tests.updated_at IS 'Timestamp when the test record was last updated';
COMMENT ON COLUMN public.drug_tests.metadata IS 'JSONB field for additional test information (test_type, collection_method, etc.)';

