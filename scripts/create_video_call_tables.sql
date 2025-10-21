-- Video Call System Database Tables
-- Run this script in your Supabase SQL editor to create the necessary tables

-- Video call sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    caller_id VARCHAR(255) NOT NULL,
    callee_id VARCHAR(255) NOT NULL,
    call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('audio', 'video')),
    status VARCHAR(20) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'connected', 'ended', 'missed', 'declined')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video call messages table
CREATE TABLE IF NOT EXISTS video_call_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'file', 'system', 'call_action')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video call invitations table
CREATE TABLE IF NOT EXISTS video_call_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    caller_id VARCHAR(255) NOT NULL,
    callee_id VARCHAR(255) NOT NULL,
    caller_name VARCHAR(255) NOT NULL,
    caller_role VARCHAR(50) NOT NULL,
    call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('audio', 'video')),
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation_id ON call_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_id ON call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee_id ON call_sessions(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_started_at ON call_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_video_call_messages_conversation_id ON video_call_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_video_call_messages_session_id ON video_call_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_video_call_messages_sender_id ON video_call_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_video_call_messages_created_at ON video_call_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_video_call_invitations_conversation_id ON video_call_invitations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_video_call_invitations_caller_id ON video_call_invitations(caller_id);
CREATE INDEX IF NOT EXISTS idx_video_call_invitations_callee_id ON video_call_invitations(callee_id);
CREATE INDEX IF NOT EXISTS idx_video_call_invitations_status ON video_call_invitations(status);
CREATE INDEX IF NOT EXISTS idx_video_call_invitations_expires_at ON video_call_invitations(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_sessions
CREATE POLICY "Users can view their own call sessions" ON call_sessions
    FOR SELECT USING (
        caller_id = auth.uid()::text OR callee_id = auth.uid()::text
    );

CREATE POLICY "Users can create call sessions" ON call_sessions
    FOR INSERT WITH CHECK (
        caller_id = auth.uid()::text
    );

CREATE POLICY "Users can update their own call sessions" ON call_sessions
    FOR UPDATE USING (
        caller_id = auth.uid()::text OR callee_id = auth.uid()::text
    );

-- RLS Policies for video_call_messages
CREATE POLICY "Users can view messages from their conversations" ON video_call_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = video_call_messages.conversation_id 
            AND (conversations.patient_id = auth.uid()::text OR conversations.provider_id = auth.uid()::text)
        )
    );

CREATE POLICY "Users can create messages in their conversations" ON video_call_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()::text AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = video_call_messages.conversation_id 
            AND (conversations.patient_id = auth.uid()::text OR conversations.provider_id = auth.uid()::text)
        )
    );

CREATE POLICY "Users can update their own messages" ON video_call_messages
    FOR UPDATE USING (
        sender_id = auth.uid()::text
    );

-- RLS Policies for video_call_invitations
CREATE POLICY "Users can view their own invitations" ON video_call_invitations
    FOR SELECT USING (
        caller_id = auth.uid()::text OR callee_id = auth.uid()::text
    );

CREATE POLICY "Users can create invitations" ON video_call_invitations
    FOR INSERT WITH CHECK (
        caller_id = auth.uid()::text
    );

CREATE POLICY "Users can update invitations they received" ON video_call_invitations
    FOR UPDATE USING (
        callee_id = auth.uid()::text
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for call_sessions
CREATE TRIGGER update_call_sessions_updated_at 
    BEFORE UPDATE ON call_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE video_call_invitations 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- Create a scheduled job to clean up expired invitations (if using pg_cron)
-- SELECT cron.schedule('cleanup-expired-invitations', '*/5 * * * *', 'SELECT cleanup_expired_invitations();');
