# 📞 Video Call API Documentation

## Overview
This document describes the comprehensive video call messaging API system for communication between staff and patients in the Serenity Connect application.

## 🗄️ Database Tables

### Required Tables (Run `scripts/create_video_call_tables.sql`)

1. **call_sessions** - Active video call sessions
2. **video_call_messages** - Messages sent during video calls
3. **video_call_invitations** - Call invitations and responses
4. **call_history** - Historical call records (already exists)

## 🚀 API Endpoints

### 1. Call Session Management

#### `POST /api/video-call/session`
Create a new video call session.

**Request Body:**
```json
{
  "conversationId": "string",
  "callType": "video" | "audio",
  "participantId": "string"
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "conversation_id": "string",
    "caller_id": "string",
    "callee_id": "string",
    "call_type": "video",
    "status": "initiated",
    "started_at": "timestamp",
    "duration_seconds": 0,
    "metadata": {}
  },
  "history": { /* call history record */ }
}
```

#### `PUT /api/video-call/session`
Update call session status.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "status": "ringing" | "connected" | "ended" | "missed" | "declined",
  "endedAt": "timestamp",
  "duration": 120
}
```

#### `GET /api/video-call/session`
Get call sessions.

**Query Parameters:**
- `conversationId` (optional) - Filter by conversation
- `status` (optional) - Filter by status
- `limit` (optional) - Number of results (default: 10)

### 2. Video Call Messaging

#### `POST /api/video-call/messages`
Send a message during a video call.

**Request Body:**
```json
{
  "conversationId": "string",
  "sessionId": "uuid",
  "messageType": "text" | "emoji" | "file" | "system" | "call_action",
  "content": "string",
  "metadata": {}
}
```

**Response:**
```json
{
  "message": {
    "id": "uuid",
    "conversation_id": "string",
    "session_id": "uuid",
    "sender_id": "string",
    "sender_name": "string",
    "sender_role": "doctor" | "nurse" | "counselor" | "patient",
    "message_type": "text",
    "content": "string",
    "metadata": {},
    "read": false,
    "created_at": "timestamp"
  },
  "chatMessage": { /* regular chat message */ }
}
```

#### `GET /api/video-call/messages`
Get video call messages.

**Query Parameters:**
- `conversationId` (required) - Conversation ID
- `sessionId` (optional) - Filter by session
- `limit` (optional) - Number of results (default: 50)
- `before` (optional) - Get messages before timestamp

### 3. Call Invitations

#### `POST /api/video-call/invite`
Send a video call invitation.

**Request Body:**
```json
{
  "conversationId": "string",
  "calleeId": "string",
  "callType": "video" | "audio",
  "message": "Incoming video call",
  "metadata": {}
}
```

**Response:**
```json
{
  "invitation": {
    "id": "uuid",
    "conversation_id": "string",
    "caller_id": "string",
    "callee_id": "string",
    "caller_name": "string",
    "caller_role": "string",
    "call_type": "video",
    "message": "string",
    "status": "pending",
    "expires_at": "timestamp",
    "created_at": "timestamp"
  }
}
```

#### `PUT /api/video-call/invite`
Respond to a video call invitation.

**Request Body:**
```json
{
  "invitationId": "uuid",
  "status": "accepted" | "declined" | "expired"
}
```

#### `GET /api/video-call/invite`
Get video call invitations.

**Query Parameters:**
- `conversationId` (optional) - Filter by conversation
- `status` (optional) - Filter by status
- `limit` (optional) - Number of results (default: 10)

### 4. Call History

#### `GET /api/video-call/history`
Get call history with statistics.

**Query Parameters:**
- `conversationId` (optional) - Filter by conversation
- `callType` (optional) - Filter by call type
- `status` (optional) - Filter by status
- `startDate` (optional) - Filter by start date
- `endDate` (optional) - Filter by end date
- `limit` (optional) - Number of results (default: 20)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "calls": [/* call history records */],
  "statistics": {
    "total_calls": 25,
    "video_calls": 15,
    "audio_calls": 10,
    "completed_calls": 20,
    "missed_calls": 3,
    "total_duration": 3600,
    "average_duration": 180
  },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### `DELETE /api/video-call/history`
Delete a call history record.

**Query Parameters:**
- `callId` (required) - Call ID to delete

### 5. Call Status

#### `GET /api/video-call/status`
Get current call status for a conversation.

**Query Parameters:**
- `conversationId` (required) - Conversation ID

**Response:**
```json
{
  "activeSession": { /* active call session or null */ },
  "pendingInvitations": [/* pending invitations */],
  "recentCalls": [/* recent call history */],
  "userStatus": {
    "online": true,
    "last_seen": "timestamp"
  },
  "timestamp": "timestamp"
}
```

#### `POST /api/video-call/status`
Update call status (join, leave, mute, etc.).

**Request Body:**
```json
{
  "conversationId": "string",
  "action": "join" | "leave" | "mute" | "unmute" | "camera_on" | "camera_off" | "screen_share" | "stop_screen_share",
  "metadata": {}
}
```

## 🔄 Real-time Events

The API uses Supabase real-time channels for live updates:

### Channel Names:
- `user_{userId}` - User-specific notifications
- `staff-calls-{userId}` - Staff call notifications

### Events:
- `video-call-invitation` - New call invitation
- `incoming-video-call` - Incoming call notification
- `video-call-response` - Call response (accepted/declined)
- `call-status-update` - Call status changes
- `invite` - General invitation (existing)
- `incoming-call` - General incoming call (existing)

## 🔐 Authentication & Authorization

All endpoints require authentication via Supabase session. Users can only:
- View their own call sessions and messages
- Create calls in conversations they're part of
- Update their own call sessions
- Respond to invitations sent to them

## 📱 Integration with Existing Chat

The video call system integrates with the existing chat system:
- Video call messages are also stored in the regular `messages` table
- Messages are prefixed with `[Video Call]` for identification
- Metadata includes session information for linking

## 🚀 Usage Examples

### Starting a Video Call:
1. Create call session: `POST /api/video-call/session`
2. Send invitation: `POST /api/video-call/invite`
3. Wait for response via real-time events
4. Update session status: `PUT /api/video-call/session`

### During a Call:
1. Send messages: `POST /api/video-call/messages`
2. Update status: `POST /api/video-call/status`
3. Monitor status: `GET /api/video-call/status`

### Ending a Call:
1. Update session status: `PUT /api/video-call/session`
2. Final messages are automatically saved

## 🛠️ Setup Instructions

1. Run the database migration: `scripts/create_video_call_tables.sql`
2. Deploy the API endpoints
3. Update frontend to use the new endpoints
4. Configure real-time subscriptions for live updates

## 📊 Error Handling

All endpoints return consistent error responses:
```json
{
  "error": "Error message",
  "status": 400
}
```

Common status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
