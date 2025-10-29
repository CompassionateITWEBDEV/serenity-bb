-- Broadcasts table for staff console announcements
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all', -- 'all' | 'staff' | 'patients' | 'clinicians'
  priority TEXT DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Simple read policy: anyone signed-in can read broadcasts
CREATE POLICY IF NOT EXISTS "Read broadcasts" ON broadcasts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create policy to allow service role inserts/updates (handled by server)
CREATE POLICY IF NOT EXISTS "Insert by service" ON broadcasts
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Update by service" ON broadcasts
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Delete by service" ON broadcasts
  FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_target ON broadcasts(target_audience);
CREATE INDEX IF NOT EXISTS idx_broadcasts_priority ON broadcasts(priority);

-- Enable realtime on table
ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts;


