-- Fix RLS policies for staff_group_chat_messages
-- The issue: Policies were trying to access auth.users table which requires special permissions
-- Solution: Use auth.uid() directly instead of querying auth.users

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can read group chat messages" ON staff_group_chat_messages;
DROP POLICY IF EXISTS "Staff can create group chat messages" ON staff_group_chat_messages;
DROP POLICY IF EXISTS "Authors can update group chat messages" ON staff_group_chat_messages;
DROP POLICY IF EXISTS "Authors can delete group chat messages" ON staff_group_chat_messages;

-- Recreate policies checking staff table
-- Read: Only active staff members can read messages
CREATE POLICY "Staff can read group chat messages" ON staff_group_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff
            WHERE staff.user_id = auth.uid()
            AND staff.active = true
        )
    );

-- Insert: Only active staff members can create messages
CREATE POLICY "Staff can create group chat messages" ON staff_group_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff
            WHERE staff.user_id = auth.uid()
            AND staff.active = true
        )
    );

-- Update: Users can update their own messages
CREATE POLICY "Authors can update group chat messages" ON staff_group_chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Delete: Users can delete their own messages
CREATE POLICY "Authors can delete group chat messages" ON staff_group_chat_messages
    FOR DELETE USING (sender_id = auth.uid());



