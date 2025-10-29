-- Add 'video_submission' to the staff_notifications type constraint
DO $$
BEGIN
    -- Drop the existing check constraint
    ALTER TABLE staff_notifications DROP CONSTRAINT IF EXISTS staff_notifications_type_check;
    
    -- Add new constraint with video_submission included
    ALTER TABLE staff_notifications ADD CONSTRAINT staff_notifications_type_check 
    CHECK (type IN ('submission', 'message', 'appointment', 'emergency', 'drug_test', 'video_submission'));
END $$;


