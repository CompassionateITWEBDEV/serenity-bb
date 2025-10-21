# 📱 Patient Video Call Messaging API Documentation

## Overview
This document describes the specialized API endpoints for patient-initiated video call messaging, allowing patients to automatically direct messages to video calls with healthcare staff.

## 🎯 Key Features

- ✅ **Automatic Video Call Initiation** - Messages can automatically trigger video call requests
- ✅ **Real-time Notifications** - Staff receive instant notifications of video call requests
- ✅ **Call Status Tracking** - Patients can monitor their call request status
- ✅ **Message Integration** - Seamless integration with existing chat system
- ✅ **Call Management** - Cancel, resend, or update call requests

## 🚀 API Endpoints

### 1. Patient Video Call Message

#### `POST /api/patient/video-call-message`
Send a message that automatically initiates a video call request.

**Request Body:**
```json
{
  "conversationId": "string",
  "message": "I'd like to schedule a video call to discuss my treatment",
  "callType": "video" | "audio",
  "autoInitiateCall": true,
  "metadata": {
    "priority": "high",
    "reason": "treatment_discussion"
  }
}
```

**Response:**
```json
{
  "message": {
    "id": "uuid",
    "conversation_id": "string",
    "sender_id": "string",
    "sender_name": "string",
    "sender_role": "patient",
    "content": "string",
    "metadata": {
      "video_call_related": true,
      "call_type": "video"
    },
    "created_at": "timestamp"
  },
  "callSession": {
    "id": "uuid",
    "conversation_id": "string",
    "caller_id": "string",
    "callee_id": "string",
    "call_type": "video",
    "status": "initiated",
    "started_at": "timestamp"
  },
  "invitation": {
    "id": "uuid",
    "conversation_id": "string",
    "caller_id": "string",
    "callee_id": "string",
    "caller_name": "string",
    "call_type": "video",
    "message": "string",
    "status": "pending",
    "expires_at": "timestamp"
  },
  "autoInitiated": true
}
```

#### `GET /api/patient/video-call-message`
Get patient's video call related messages and history.

**Query Parameters:**
- `conversationId` (required) - Conversation ID
- `includeCallHistory` (optional) - Include call history (default: false)

**Response:**
```json
{
  "messages": [/* video call related messages */],
  "callHistory": [/* call history records */],
  "conversation": {
    "id": "string",
    "provider_id": "string"
  }
}
```

### 2. Staff Video Call Response

#### `POST /api/staff/video-call-response`
Staff responds to patient's video call request.

**Request Body:**
```json
{
  "invitationId": "uuid",
  "response": "accepted" | "declined",
  "message": "I'll be available in 5 minutes",
  "metadata": {
    "availability": "5_minutes"
  }
}
```

**Response:**
```json
{
  "invitation": {
    "id": "uuid",
    "status": "accepted",
    "responded_at": "timestamp",
    "metadata": {
      "staff_response": {
        "staff_id": "string",
        "staff_name": "string",
        "response": "accepted",
        "message": "string",
        "timestamp": "timestamp"
      }
    }
  },
  "session": {
    "id": "uuid",
    "status": "ringing",
    "metadata": {
      "staff_accepted": true,
      "staff_id": "string",
      "staff_name": "string",
      "accepted_at": "timestamp"
    }
  },
  "message": {
    "id": "uuid",
    "content": "Staff John Doe accepted your video call request. I'll be available in 5 minutes",
    "metadata": {
      "video_call_response": true,
      "response": "accepted"
    }
  },
  "response": "accepted"
}
```

#### `GET /api/staff/video-call-response`
Get pending video call invitations for staff.

**Query Parameters:**
- `status` (optional) - Filter by status (default: "pending")
- `limit` (optional) - Number of results (default: 20)

**Response:**
```json
{
  "invitations": [/* pending invitations */],
  "count": 5
}
```

### 3. Patient Video Call Status

#### `GET /api/patient/video-call-status`
Get comprehensive video call status for a patient.

**Query Parameters:**
- `conversationId` (required) - Conversation ID

**Response:**
```json
{
  "conversation": {
    "id": "string",
    "provider_id": "string",
    "provider_name": "string",
    "provider_role": "string"
  },
  "activeSession": {
    "id": "uuid",
    "status": "ringing",
    "call_type": "video",
    "started_at": "timestamp"
  },
  "pendingInvitations": [/* pending invitations */],
  "recentCalls": [/* recent call history */],
  "videoMessages": [/* video call related messages */],
  "statistics": {
    "total_calls": 15,
    "video_calls": 10,
    "audio_calls": 5,
    "completed_calls": 12,
    "missed_calls": 2,
    "declined_calls": 1,
    "total_duration": 3600,
    "average_duration": 300
  },
  "timestamp": "timestamp"
}
```

#### `POST /api/patient/video-call-status`
Manage video call requests (cancel, resend, update).

**Request Body:**
```json
{
  "conversationId": "string",
  "action": "cancel_request" | "resend_invitation" | "update_message",
  "invitationId": "uuid",
  "message": "Updated message",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "action": "cancel_request",
  "cancelledInvitation": { /* invitation details */ },
  "timestamp": "timestamp"
}
```

## 🔄 Real-time Events

### Patient Events:
- `patient-video-call-request` - New video call request sent
- `video-call-response` - Staff response to call request

### Staff Events:
- `incoming-video-call` - New video call request received
- `patient-video-call-request` - Patient initiated video call

## 📱 Usage Examples

### Patient Initiating Video Call:
```javascript
// Send message that automatically initiates video call
const response = await fetch('/api/patient/video-call-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'conv-123',
    message: 'I need to discuss my medication with you',
    callType: 'video',
    autoInitiateCall: true
  })
});

const { message, callSession, invitation } = await response.json();
```

### Staff Responding to Call:
```javascript
// Staff accepts the video call request
const response = await fetch('/api/staff/video-call-response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invitationId: 'inv-123',
    response: 'accepted',
    message: 'I can call you in 5 minutes'
  })
});

const { invitation, session, message } = await response.json();
```

### Patient Checking Status:
```javascript
// Check video call status
const response = await fetch('/api/patient/video-call-status?conversationId=conv-123');
const { activeSession, pendingInvitations, statistics } = await response.json();
```

## 🔐 Authentication & Authorization

- **Patient endpoints** require patient authentication
- **Staff endpoints** require staff authentication
- Users can only access their own conversations and requests
- Real-time notifications are sent to appropriate channels

## 🎯 Integration with Existing System

The patient video call messaging API integrates seamlessly with:
- ✅ **Existing chat system** - Messages are stored in regular messages table
- ✅ **Video call infrastructure** - Uses existing call session management
- ✅ **Real-time notifications** - Leverages existing Supabase channels
- ✅ **User authentication** - Uses existing auth system

## 🚀 Frontend Integration

### Patient Interface:
1. **Message Input** - Add "Video Call" button to message input
2. **Call Status** - Show pending/active call status
3. **Call History** - Display call statistics and history
4. **Real-time Updates** - Listen for staff responses

### Staff Interface:
1. **Incoming Requests** - Show pending video call requests
2. **Quick Actions** - Accept/decline buttons
3. **Call Management** - Start/end call functionality
4. **Response Messages** - Send messages with responses

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

## 🛠️ Setup Instructions

1. **Ensure video call tables exist** (run `scripts/create_video_call_tables.sql`)
2. **Deploy the new API endpoints**
3. **Update frontend** to use the new patient-specific endpoints
4. **Configure real-time subscriptions** for live updates

## 🎉 Benefits

- **Simplified Patient Experience** - One-click video call initiation
- **Automatic Notifications** - Staff get instant alerts
- **Status Tracking** - Patients can monitor their requests
- **Seamless Integration** - Works with existing chat system
- **Real-time Updates** - Live status updates and responses
