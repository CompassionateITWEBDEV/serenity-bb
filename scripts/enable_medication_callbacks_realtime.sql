-- Enable real-time for medication_callbacks table
-- This allows real-time updates to be broadcast to connected clients

-- Enable real-time publication for medication_callbacks table
ALTER PUBLICATION supabase_realtime ADD TABLE medication_callbacks;

-- Verify real-time is enabled
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'medication_callbacks';

-- If the above query returns a row, real-time is enabled
-- If no row is returned, run the ALTER PUBLICATION command above













