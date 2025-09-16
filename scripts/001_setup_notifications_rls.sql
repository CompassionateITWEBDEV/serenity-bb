-- Enable RLS on notifications table and create policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow patients to view their own notifications
CREATE POLICY "notifications_select_own" 
ON notifications FOR SELECT 
USING (patient_id::text = auth.uid()::text);

-- Allow patients to update their own notifications (mark as read/unread)
CREATE POLICY "notifications_update_own" 
ON notifications FOR UPDATE 
USING (patient_id::text = auth.uid()::text);

-- Allow patients to delete their own notifications
CREATE POLICY "notifications_delete_own" 
ON notifications FOR DELETE 
USING (patient_id::text = auth.uid()::text);

-- Allow system to insert notifications for any patient (for staff/admin use)
CREATE POLICY "notifications_insert_system" 
ON notifications FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_patient_id ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
