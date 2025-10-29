-- Enable Realtime for appointments table
-- This allows staff to see new appointments in real-time when patients create them
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;


