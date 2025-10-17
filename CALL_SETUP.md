# Video Call System Setup

The video call system has been enhanced with a modern Messenger-like interface and call history tracking. Here's how to set it up:

## Features

✅ **Modern UI/UX** - Messenger-style interface with dark theme
✅ **Video & Audio Calls** - Full WebRTC support with screen sharing
✅ **Call History** - Track all call events and statistics
✅ **Real-time Notifications** - Incoming call banners with animations
✅ **Media Controls** - Mute, camera toggle, screen share
✅ **Responsive Design** - Works on all devices

## Database Setup

To enable call history tracking, run the following SQL in your Supabase SQL editor:

```sql
-- Create call history table
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

-- Enable RLS (Row Level Security)
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own call history" ON call_history
    FOR SELECT USING (
        caller_id = auth.uid()::text OR callee_id = auth.uid()::text
    );

CREATE POLICY "Users can insert their own call history" ON call_history
    FOR INSERT WITH CHECK (
        caller_id = auth.uid()::text
    );

CREATE POLICY "Users can update their own call history" ON call_history
    FOR UPDATE USING (
        caller_id = auth.uid()::text OR callee_id = auth.uid()::text
    );
```

## Quick Setup

1. **Run the SQL migration** above in your Supabase dashboard
2. **Restart your application** to ensure all changes are loaded
3. **Test the video calls** - they should work immediately
4. **Call history will appear** in the messages page sidebar

## How It Works

### For Staff:
1. Go to Messages page
2. Select a conversation with a patient
3. Click the phone/video icon in the header
4. Patient receives an incoming call banner
5. Patient can accept/decline the call

### For Patients:
1. Go to Messages page
2. Select a conversation with staff
3. Click the phone/video icon in the header
4. Staff receives an incoming call banner
5. Staff can accept/decline the call

### Call Features:
- **Video calls** with camera toggle
- **Audio calls** for voice-only communication
- **Screen sharing** for presentations
- **Mute/unmute** controls
- **Call duration** tracking
- **Call history** with status tracking

## Troubleshooting

### If you see "Call history table not found" warnings:
- The call system will work fine without the database table
- Run the SQL migration above to enable call history
- The warnings are just informational and won't break functionality

### If calls don't connect:
- Check your browser's camera/microphone permissions
- Ensure you're using HTTPS (required for WebRTC)
- Check the browser console for any WebRTC errors

### If you see database errors:
- Make sure your Supabase connection is working
- Check that the `call_history` table was created successfully
- Verify RLS policies are set up correctly

## File Structure

```
app/call/[conversationId]/page.tsx     # Main call page
components/call/
  ├── IncomingCallBanner.tsx          # Incoming call notification
  └── CallHistory.tsx                 # Call history component
lib/call-tracking.ts                  # Call tracking service
backend/migrations/002_add_call_history.sql  # Database migration
scripts/run-migration.sql             # Quick migration script
```

## Environment Variables

No additional environment variables are required. The system uses your existing Supabase configuration.

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari (limited WebRTC support)
- Edge

## Security

- All calls are peer-to-peer (WebRTC)
- No call data is stored on servers
- Call history only stores metadata (no recordings)
- RLS policies ensure users only see the

ir own call history




