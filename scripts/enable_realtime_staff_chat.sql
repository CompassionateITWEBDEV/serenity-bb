-- Enable Realtime for staff_group_chat_messages table
-- This allows real-time subscriptions to work properly

-- Add table to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE staff_group_chat_messages;

-- Note: If you get an error that the table is already in the publication, that's okay.
-- This just ensures Realtime is enabled for INSERT/UPDATE/DELETE events.


