-- Create staff_notifications table for real-time staff alerts
CREATE TABLE IF NOT EXISTS staff_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('submission', 'message', 'appointment', 'emergency', 'drug_test')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name VARCHAR(255) NOT NULL,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_notifications_staff_id ON staff_notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_patient_id ON staff_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_created_at ON staff_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_read ON staff_notifications(read);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_type ON staff_notifications(type);

-- Create staff_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'nurse', 'therapist', 'admin', 'staff')),
  active BOOLEAN DEFAULT TRUE,
  notification_preferences JSONB DEFAULT '{
    "email_notifications": true,
    "push_notifications": true,
    "sms_notifications": false,
    "submission_alerts": true,
    "message_alerts": true,
    "appointment_alerts": true,
    "emergency_alerts": true
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_notifications
CREATE POLICY "Staff can view their own notifications" ON staff_notifications
  FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can update their own notifications" ON staff_notifications
  FOR UPDATE USING (staff_id = auth.uid());

-- RLS Policies for staff_members
CREATE POLICY "Staff can view all staff members" ON staff_members
  FOR SELECT USING (true);

CREATE POLICY "Staff can update their own profile" ON staff_members
  FOR UPDATE USING (user_id = auth.uid());

-- Function to automatically create staff member when user signs up with staff role
CREATE OR REPLACE FUNCTION create_staff_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has staff role in user_metadata
  IF NEW.raw_user_meta_data->>'role' = 'staff' THEN
    INSERT INTO staff_members (user_id, first_name, last_name, email, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Staff'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Member'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'staff_role', 'staff')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create staff member on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_staff_member();

-- Function to clean up old notifications (optional)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM staff_notifications 
  WHERE created_at < NOW() - INTERVAL '30 days' 
  AND read = true;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old notifications (if using pg_cron)
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications();');
