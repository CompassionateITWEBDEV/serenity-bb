-- Create staff_group_chat_messages table for staff group chat
CREATE TABLE IF NOT EXISTS staff_group_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_avatar TEXT,
    role_group VARCHAR(10) DEFAULT 'all', -- 'all', 'st', 'pt', 'hha', 'msw'
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add role_group column if table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_group_chat_messages' 
        AND column_name = 'role_group'
    ) THEN
        ALTER TABLE staff_group_chat_messages ADD COLUMN role_group VARCHAR(10) DEFAULT 'all';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_group_chat_sender_id ON staff_group_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_staff_group_chat_created_at ON staff_group_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_group_chat_role_group ON staff_group_chat_messages(role_group);

-- Create RLS policies
ALTER TABLE staff_group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can read all group chat messages
-- Verify user exists in staff table
CREATE POLICY "Staff can read group chat messages" ON staff_group_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff
            WHERE staff.user_id = auth.uid()
            AND staff.active = true
        )
    );

-- Policy: Staff can create group chat messages
-- Verify user exists in staff table
CREATE POLICY "Staff can create group chat messages" ON staff_group_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff
            WHERE staff.user_id = auth.uid()
            AND staff.active = true
        )
    );

-- Policy: Authors can update their own messages
CREATE POLICY "Authors can update group chat messages" ON staff_group_chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Policy: Authors can delete their own messages
CREATE POLICY "Authors can delete group chat messages" ON staff_group_chat_messages
    FOR DELETE USING (sender_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_group_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_staff_group_chat_updated_at
    BEFORE UPDATE ON staff_group_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_group_chat_updated_at();

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE staff_group_chat_messages;

-- Insert sample welcome message
INSERT INTO staff_group_chat_messages (content, sender_id, sender_name, sender_avatar) VALUES
('Welcome to the Staff Group Chat! This is where we communicate as a team.', 
 (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'staff' LIMIT 1),
 'System',
 NULL)
ON CONFLICT DO NOTHING;
