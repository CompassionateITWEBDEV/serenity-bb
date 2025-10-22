# 📞 Patient Video Call API Documentation

## Overview
This document describes the specialized video call messaging APIs designed specifically for patients to easily initiate and manage video calls with healthcare providers.

## 🎯 Key Features

- **Automatic Video Call Detection** - Detects video call keywords in messages
- **One-Click Call Initiation** - Easy call starting from messaging interface
- **Real-time Notifications** - Instant updates to healthcare providers
- **Call Status Management** - Track and manage call states
- **Patient-Specific Security** - Ensures only patients can access these endpoints

## 🚀 API Endpoints

### 1. Patient Video Call Message API

#### `POST /api/patient/video-call-message`
Send a message that can automatically initiate a video call.

**Request Body:**
```json
{
  "conversationId": "string",
  "content": "I would like to have a video call",
  "messageType": "text",
  "autoInitiateCall": false,
  "callType": "video",
  "metadata": {}
}
```

**Auto-Detection Keywords:**
- "video call", "video chat", "video meeting"
- "call me", "video", "face to face"
- "meet online", "video session"
- "video consultation", "video appointment"

**Response:**
```json
{
  "message": { /* regular message */ },
  "videoCallMessage": { /* video call message */ },
  "callSession": { /* call session if initiated */ },
  "callInvitation": { /* invitation if sent */ },
  "videoCallInitiated": true,
  "callType": "video"
}
```

#### `GET /api/patient/video-call-message`
Get messages with optional video call data.

**Query Parameters:**
- `conversationId` (required) - Conversation ID
- `includeVideoCalls` (optional) - Include video call sessions
- `limit` (optional) - Number of results (default: 50)
- `before` (optional) - Get messages before timestamp

### 2. Patient Video Call Initiation API

#### `POST /api/patient/initiate-video-call`
Directly initiate a video call with a healthcare provider.

**Request Body:**
```json
{
  "conversationId": "string",
  "callType": "video",
  "message": "I would like to start a video call",
  "priority": "normal",
  "metadata": {}
}
```

**Priority Levels:**
- `"normal"` - Standard call request
- `"urgent"` - High priority call
- `"emergency"` - Emergency call (if supported)

**Response:**
```json
{
  "callSession": { /* call session */ },
  "callInvitation": { /* invitation sent to provider */ },
  "callHistory": { /* history record */ },
  "message": { /* conversation message */ },
  "videoCallMessage": { /* video call message */ },
  "notification": {
    "sent": true,
    "channels": ["user", "staff"]
  }
}
```

#### `GET /api/patient/initiate-video-call`
Get call sessions and invitations for a conversation.

**Query Parameters:**
- `conversationId` (required) - Conversation ID
- `status` (optional) - Filter by status
- `limit` (optional) - Number of results (default: 10)

### 3. Patient Video Call Status API

#### `GET /api/patient/video-call-status`
Get current call status and statistics.

**Query Parameters:**
- `conversationId` (required) - Conversation ID

**Response:**
```json
{
  "activeSession": { /* active call or null */ },
  "pendingInvitations": [/* pending invitations */],
  "recentCalls": [/* recent call history */],
  "statistics": {
    "total_calls": 15,
    "video_calls": 10,
    "audio_calls": 5,
    "completed_calls": 12,
    "missed_calls": 2,
    "total_duration": 3600,
    "average_duration": 300
  },
  "canInitiateCall": true,
  "provider": {
    "id": "provider_id",
    "name": "Dr. Smith",
    "role": "doctor"
  }
}
```

#### `POST /api/patient/video-call-status`
Update call status or perform actions.

**Request Body:**
```json
{
  "conversationId": "string",
  "action": "request_call" | "cancel_request" | "join_call" | "leave_call" | "mute" | "unmute" | "camera_on" | "camera_off",
  "metadata": {}
}
```

### 4. Patient Video Call Response API

#### `POST /api/patient/video-call-response`
Respond to incoming video call invitations.

**Request Body:**
```json
{
  "invitationId": "uuid",
  "response": "accepted" | "declined" | "busy",
  "message": "Optional response message"
}
```

**Response:**
```json
{
  "invitation": { /* updated invitation */ },
  "session": { /* call session if accepted */ },
  "message": { /* conversation message */ },
  "response": "accepted",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### `GET /api/patient/video-call-response`
Get incoming call invitations.

**Query Parameters:**
- `conversationId` (optional) - Filter by conversation
- `status` (optional) - Filter by status
- `limit` (optional) - Number of results (default: 10)

## 🔄 Real-time Events

### Patient-Specific Events:
- `patient-video-request` - Patient requests video call
- `incoming-patient-video-call` - Staff receives patient call request
- `video-call-accepted` - Call accepted by patient
- `video-call-response` - Patient responds to call
- `patient-call-action` - Patient performs call action

### Event Payload Example:
```json
{
  "type": "patient_video_call_request",
  "conversation_id": "uuid",
  "patient_id": "uuid",
  "patient_name": "John Doe",
  "call_type": "video",
  "message": "I need to discuss my treatment",
  "session_id": "uuid",
  "invitation_id": "uuid",
  "priority": "normal",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🎯 Usage Examples

### 1. Automatic Video Call Detection
```javascript
// Send a message that will auto-detect video call intent
const response = await fetch('/api/patient/video-call-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'conv-123',
    content: 'Can we have a video call to discuss my progress?',
    messageType: 'text'
  })
});

const data = await response.json();
if (data.videoCallInitiated) {
  console.log('Video call automatically initiated!');
  console.log('Session ID:', data.callSession.id);
}
```

### 2. Direct Video Call Initiation
```javascript
// Directly initiate a video call
const response = await fetch('/api/patient/initiate-video-call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'conv-123',
    callType: 'video',
    message: 'I need immediate assistance',
    priority: 'urgent'
  })
});

const data = await response.json();
console.log('Call initiated:', data.callSession.id);
```

### 3. Respond to Incoming Call
```javascript
// Accept an incoming call
const response = await fetch('/api/patient/video-call-response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invitationId: 'inv-123',
    response: 'accepted',
    message: 'I\'m ready for the call'
  })
});

const data = await response.json();
if (data.response === 'accepted') {
  console.log('Call accepted! Session:', data.session.id);
}
```

### 4. Check Call Status
```javascript
// Get current call status
const response = await fetch('/api/patient/video-call-status?conversationId=conv-123');
const data = await response.json();

if (data.activeSession) {
  console.log('Active call:', data.activeSession.status);
} else if (data.canInitiateCall) {
  console.log('Ready to initiate call');
} else {
  console.log('Call in progress or unavailable');
}
```

## 🔐 Security Features

- **Patient-Only Access** - All endpoints verify user is a patient
- **Conversation Validation** - Ensures patient is part of conversation
- **Session Management** - Secure call session handling
- **Real-time Security** - Encrypted real-time communications

## 📱 Frontend Integration

### React Hook Example:
```javascript
import { useState, useEffect } from 'react';

function usePatientVideoCalls(conversationId) {
  const [callStatus, setCallStatus] = useState(null);
  const [canInitiate, setCanInitiate] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const response = await fetch(`/api/patient/video-call-status?conversationId=${conversationId}`);
      const data = await response.json();
      setCallStatus(data);
      setCanInitiate(data.canInitiateCall);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [conversationId]);

  const initiateCall = async (message, callType = 'video') => {
    const response = await fetch('/api/patient/initiate-video-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        callType,
        message
      })
    });
    return response.json();
  };

  return { callStatus, canInitiate, initiateCall };
}
```

## 🚀 Setup Instructions

1. **Ensure database tables exist** (run `scripts/create_video_call_tables.sql`)
2. **Deploy the API endpoints**
3. **Configure real-time subscriptions** for live updates
4. **Update frontend** to use the new patient-specific endpoints

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
- `403` - Forbidden (not a patient)
- `404` - Not Found
- `409` - Conflict (active call exists)
- `500` - Internal Server Error

## 🎯 Benefits for Patients

- **Easy Call Initiation** - One-click video call starting
- **Automatic Detection** - Smart keyword detection
- **Real-time Updates** - Instant status notifications
- **Call History** - Track all video interactions
- **Priority Support** - Urgent call handling
- **Mobile Friendly** - Optimized for mobile devices