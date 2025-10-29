-- Patient Verification System for Supabase
-- This script creates tables and policies for managing patient verification status

-- Create patient_verifications table
CREATE TABLE IF NOT EXISTS patient_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL, -- 'identity', 'insurance', 'medical_history', 'emergency_contact'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'requires_update'
    verified_by UUID REFERENCES auth.users(id), -- staff member who verified
    verification_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    required_documents JSONB DEFAULT '[]'::jsonb, -- list of required documents
    submitted_documents JSONB DEFAULT '[]'::jsonb, -- list of submitted documents
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patient_verification_documents table
CREATE TABLE IF NOT EXISTS patient_verification_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    verification_id UUID NOT NULL REFERENCES patient_verifications(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'id_document', 'insurance_card', 'medical_record', 'emergency_contact_proof'
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id)
);

-- Create patient_verification_logs table for audit trail
CREATE TABLE IF NOT EXISTS patient_verification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    verification_id UUID NOT NULL REFERENCES patient_verifications(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'approved', 'rejected', 'document_uploaded'
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_verifications_patient_id ON patient_verifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_verifications_status ON patient_verifications(status);
CREATE INDEX IF NOT EXISTS idx_patient_verifications_type ON patient_verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_patient_verifications_verified_by ON patient_verifications(verified_by);
CREATE INDEX IF NOT EXISTS idx_patient_verification_documents_verification_id ON patient_verification_documents(verification_id);
CREATE INDEX IF NOT EXISTS idx_patient_verification_logs_verification_id ON patient_verification_logs(verification_id);

-- Enable Row Level Security
ALTER TABLE patient_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patient_verifications
-- Patients can view their own verifications
CREATE POLICY "Patients can view own verifications" ON patient_verifications
    FOR SELECT USING (auth.uid() = patient_id);

-- Staff can view all verifications
CREATE POLICY "Staff can view all verifications" ON patient_verifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- Staff can update verifications
CREATE POLICY "Staff can update verifications" ON patient_verifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- Staff can insert verifications
CREATE POLICY "Staff can insert verifications" ON patient_verifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- RLS Policies for patient_verification_documents
-- Patients can view their own documents
CREATE POLICY "Patients can view own documents" ON patient_verification_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patient_verifications 
            WHERE patient_verifications.id = verification_id 
            AND patient_verifications.patient_id = auth.uid()
        )
    );

-- Staff can view all documents
CREATE POLICY "Staff can view all documents" ON patient_verification_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- Patients can upload documents
CREATE POLICY "Patients can upload documents" ON patient_verification_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM patient_verifications 
            WHERE patient_verifications.id = verification_id 
            AND patient_verifications.patient_id = auth.uid()
        )
    );

-- Staff can update documents
CREATE POLICY "Staff can update documents" ON patient_verification_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- RLS Policies for patient_verification_logs
-- Staff can view all logs
CREATE POLICY "Staff can view all logs" ON patient_verification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- Staff can insert logs
CREATE POLICY "Staff can insert logs" ON patient_verification_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_patient_verifications_updated_at 
    BEFORE UPDATE ON patient_verifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to log verification changes
CREATE OR REPLACE FUNCTION log_verification_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO patient_verification_logs (
        verification_id,
        action,
        performed_by,
        old_status,
        new_status,
        notes
    ) VALUES (
        NEW.id,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'created'
            WHEN TG_OP = 'UPDATE' THEN 'updated'
            ELSE TG_OP
        END,
        auth.uid(),
        OLD.status,
        NEW.status,
        CASE 
            WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 
                'Status changed from ' || OLD.status || ' to ' || NEW.status
            ELSE NULL
        END
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for logging changes
CREATE TRIGGER log_patient_verification_changes
    AFTER INSERT OR UPDATE ON patient_verifications
    FOR EACH ROW EXECUTE FUNCTION log_verification_change();

-- Create view for easy querying of verification status
CREATE OR REPLACE VIEW patient_verification_summary AS
SELECT 
    pv.patient_id,
    u.email,
    u.raw_user_meta_data->>'first_name' as first_name,
    u.raw_user_meta_data->>'last_name' as last_name,
    COUNT(*) as total_verifications,
    COUNT(CASE WHEN pv.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN pv.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN pv.status = 'rejected' THEN 1 END) as rejected_count,
    CASE 
        WHEN COUNT(CASE WHEN pv.status = 'approved' THEN 1 END) = COUNT(*) 
        AND COUNT(*) > 0 THEN 'fully_verified'
        WHEN COUNT(CASE WHEN pv.status = 'rejected' THEN 1 END) > 0 THEN 'has_rejections'
        WHEN COUNT(CASE WHEN pv.status = 'pending' THEN 1 END) > 0 THEN 'pending_verification'
        ELSE 'not_started'
    END as overall_status,
    MAX(pv.updated_at) as last_updated
FROM patient_verifications pv
JOIN auth.users u ON u.id = pv.patient_id
GROUP BY pv.patient_id, u.email, u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name';

-- Grant permissions
GRANT SELECT ON patient_verification_summary TO authenticated;

