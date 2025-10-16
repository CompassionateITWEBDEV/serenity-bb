-- Add call history tracking table
CREATE TABLE IF NOT EXISTS call_history (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    caller_id VARCHAR(255) NOT NULL,
    callee_id VARCHAR(255) NOT NULL,
    caller_name VARCHAR(255) NOT NULL,
    callee_name VARCHAR(255) NOT NULL,
    call_type VARCHAR(20) NOT NULL, -- 'audio' or 'video'
    status VARCHAR(20) NOT NULL, -- 'initiated', 'ringing', 'connected', 'ended', 'missed', 'declined'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_history_conversation_id ON call_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_history_caller_id ON call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_callee_id ON call_history(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_history_started_at ON call_history(started_at);
CREATE INDEX IF NOT EXISTS idx_call_history_status ON call_history(status);


