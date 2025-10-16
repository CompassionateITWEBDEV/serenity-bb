-- Fix video submissions table for real-time video system
-- This script creates the video_submissions table if it doesn't exist

-- Create video_submissions table
CREATE TABLE IF NOT EXISTS video_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(user_id) ON DELETE CASCADE,
    visitor_id UUID, -- for guest users (nullable)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'daily-checkin', -- 'daily-checkin', 'medication', 'therapy-session', 'progress-update'
    status VARCHAR(50) NOT NULL DEFAULT 'uploading', -- 'uploading', 'processing', 'completed', 'failed'
    video_url TEXT,
    storage_path TEXT,
    size_mb DECIMAL(10,2),
    duration_seconds INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_submissions_patient_id ON video_submissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_video_submissions_visitor_id ON video_submissions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_video_submissions_status ON video_submissions(status);
CREATE INDEX IF NOT EXISTS idx_video_submissions_submitted_at ON video_submissions(submitted_at);

-- Enable Row Level Security
ALTER TABLE video_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Patients can view their own video submissions" ON video_submissions
    FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert their own video submissions" ON video_submissions
    FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update their own video submissions" ON video_submissions
    FOR UPDATE USING (patient_id = auth.uid());

CREATE POLICY "Patients can delete their own video submissions" ON video_submissions
    FOR DELETE USING (patient_id = auth.uid());

-- Staff can view all video submissions
CREATE POLICY "Staff can view all video submissions" ON video_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE staff.user_id = auth.uid()
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_video_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_submissions_updated_at
    BEFORE UPDATE ON video_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_video_submissions_updated_at();
