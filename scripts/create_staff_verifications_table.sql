-- Create staff_verifications table to track which staff members are verified by patients
CREATE TABLE IF NOT EXISTS staff_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Optional 1-5 star rating
  comment TEXT, -- Optional patient comment
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a patient can only verify a staff member once (unique constraint)
  UNIQUE(staff_id, patient_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_verifications_staff_id ON staff_verifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_verifications_patient_id ON staff_verifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_staff_verifications_verified_at ON staff_verifications(verified_at DESC);

-- Enable Row Level Security
ALTER TABLE staff_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Patients can view all verifications (to see who verified their providers)
-- Simplified policy: allow authenticated users to view verifications
CREATE POLICY "Authenticated users can view verifications" ON staff_verifications
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Patients can insert their own verifications
CREATE POLICY "Patients can create verifications" ON staff_verifications
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Patients can update their own verifications
CREATE POLICY "Patients can update their own verifications" ON staff_verifications
  FOR UPDATE USING (auth.uid() = patient_id);

-- Staff can view verifications for themselves
CREATE POLICY "Staff can view their own verifications" ON staff_verifications
  FOR SELECT USING (auth.uid() = staff_id);

-- Enable Realtime for staff verifications
ALTER PUBLICATION supabase_realtime ADD TABLE staff_verifications;



