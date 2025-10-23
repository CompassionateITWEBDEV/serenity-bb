# 📞 Patient Video Call API Documentation

## Overview
This document describes the specialized video call messaging APIs designed specifically for patients to easily initiate and manage video calls with their healthcare providers.

## 🎯 Key Features

- ✅ **Automatic Video Call Redirection** - Messages can automatically redirect to video calls
- ✅ **Patient-Specific Endpoints** - Dedicated APIs for patient use only
- ✅ **Real-time Notifications** - Instant notifications to staff when patients request calls
- ✅ **Call History Tracking** - Complete call history and statistics for patients
- ✅ **Easy Integration** - Simple API calls that handle complex video call setup

## 🚀 API Endpoints

### 1. Patient Video Call Request

#### `POST /api/patient/video-call`
Send a message that automatically initiates a video call request.

**Request Body:**
```json
{
  "conversationId": "string",
  "message": "I'd like to start a video call to discuss my treatment",
  "callType": "video" | "audio",
  "autoRedirect": true,
  "metadata": {
    "priority": "normal",
    "reason": "treatment_discussion"
  }
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "conversation_id": "string",
    "caller_id": "string",
    "callee_id": "string",
    "call_type": "video",
    "status": "initiated",
    "started_at": "timestamp",
    "metadata": {
      "patient_initiated": true,
      "auto_redirect": true
    }
  },
  "invitation": {
    "id": "uuid",
    "conversation_id": "string",
    "caller_id": "string",
    "callee_id": "string",
    "caller_name": "Patient Name",
    "caller_role": "patient",
    "call_type": "video",
    "message": "Patient wants to start a video call: I'd like to start a video call...",
    "status": "pending",
    "expires_at": "timestamp"
  },
  "chatMessage": {
    "id": "uuid",
    "conversation_id": "string",
    "sender_id": "string",
    "sender_name": "Patient Name",
    "sender_role": "patient",
    "content": "[Video Call Request] I'd like to start a video call...",
    "metadata": {
      "video_call_request": true,
      "session_id": "uuid",
      "invitation_id": "uuid",
      "call_type": "video",
      "auto_redirect": true
    }
  },
  "redirect_url": "/call/conversationId?role=caller&mode=video&peer=staffId&peerName=Staff"
}
```

#### `GET /api/patient/video-call`
Get patient's video call sessions and invitations.

**Query Parameters:**
- `conversationId` (optional) - Filter by conversation
- `status` (optional) - Filter by status

### 2. Patient Video Call Status

#### `GET /api/patient/video-call/status`
Get current video call status for a conversation.

**Query Parameters:**
- `conversationId` (required) - Conversation ID

**Response:**
```json
{
  "activeSession": {
    "id": "uuid",
    "conversation_id": "string",
    "caller_id": "string",
    "callee_id": "string",
    "call_type": "video",
    "status": "connected",
    "started_at": "timestamp",
    "conversations": {
      "provider_name": "Dr. Smith",
      "provider_role": "doctor",
      "provider_avatar": "url"
    }
  },
  "pendingInvitations": [],
  "recentCalls": [/* recent call history */],
  "providerStatus": {
    "online": true,
    "last_seen": "timestamp"
  },
  "patientInfo": {
    "id": "uuid",
    "name": "Patient Name"
  },
  "canInitiateCall": true,
  "timestamp": "timestamp"
}
```

#### `POST /api/patient/video-call/status`
Update call status (join, leave, mute, etc.).

**Request Body:**
```json
{
  "conversationId": "string",
  "action": "join" | "leave" | "mute" | "unmute" | "camera_on" | "camera_off" | "end_call",
  "metadata": {
    "reason": "user_requested"
  }
}
```

### 3. Patient Video Call Response

#### `POST /api/patient/video-call/respond`
Respond to a video call invitation.

**Request Body:**
```json
{
  "invitationId": "uuid",
  "response": "accepted" | "declined",
  "message": "I'm ready to start the call"
}
```

**Response:**
```json
{
  "success": true,
  "invitation": { /* updated invitation */ },
  "session": { /* call session */ },
  "chatMessage": { /* conversation message */ },
  "redirect_url": "/call/conversationId?role=caller&mode=video&peer=staffId&peerName=Staff"
}
```

#### `GET /api/patient/video-call/respond`
Get patient's video call invitations.

### 4. Patient Video Call History

#### `GET /api/patient/video-call/history`
Get patient's call history with detailed statistics.

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
    "total_calls": 15,
    "video_calls": 10,
    "audio_calls": 5,
    "completed_calls": 12,
    "missed_calls": 2,
    "declined_calls": 1,
    "total_duration": 3600,
    "average_duration": 300,
    "calls_this_week": 3,
    "calls_this_month": 8
  },
  "recentSessions": [/* recent call sessions */],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": false
  },
  "patientInfo": {
    "id": "uuid",
    "name": "Patient Name"
  }
}
```

#### `DELETE /api/patient/video-call/history`
Delete a call history record.

**Query Parameters:**
- `callId` (required) - Call ID to delete

### 5. Enhanced Patient Chat API

#### `POST /api/chat/patient-send`
Send a message with optional video call integration.

**Request Body:**
```json
{
  "content": "I need to discuss my treatment plan",
  "videoCallRequest": true,
  "callType": "video",
  "autoRedirect": true,
  "metadata": {
    "priority": "urgent",
    "reason": "treatment_plan"
  }
}
```

**Response:**
```json
{
  "conversationId": "uuid",
  "message": { /* chat message */ },
  "callSession": { /* call session if videoCallRequest is true */ },
  "invitation": { /* invitation if videoCallRequest is true */ },
  "redirect_url": "/call/conversationId?role=caller&mode=video&peer=staffId&peerName=Staff"
}
```

## 🔄 Real-time Events

### Channel Names:
- `user_{userId}` - User-specific notifications
- `staff-calls-{staffId}` - Staff call notifications

### Events:
- `patient-video-call-request` - Patient requests a video call
- `incoming-patient-video-call` - Staff receives patient call request
- `patient-video-call-response` - Patient responds to call invitation
- `patient-call-response` - Staff receives patient response
- `patient-call-status-update` - Live call status updates

## 📱 Usage Examples

### 1. Simple Video Call Request
```javascript
// Patient sends a message that automatically starts a video call
const response = await fetch('/api/patient/video-call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'conv-123',
    message: 'I need to discuss my medication',
    callType: 'video',
    autoRedirect: true
  })
});

const data = await response.json();
if (data.redirect_url) {
  // Automatically redirect to video call
  window.location.href = data.redirect_url;
}
```

### 2. Check Call Status
```javascript
// Check if there's an active call
const response = await fetch('/api/patient/video-call/status?conversationId=conv-123');
const status = await response.json();

if (status.activeSession) {
  console.log('Active call:', status.activeSession);
} else if (status.canInitiateCall) {
  console.log('Can start a new call');
}
```

### 3. Get Call History
```javascript
// Get patient's call history with statistics
const response = await fetch('/api/patient/video-call/history?limit=10');
const history = await response.json();

console.log('Total calls:', history.statistics.total_calls);
console.log('Average duration:', history.statistics.average_duration);
```

### 4. Enhanced Chat with Video Call
```javascript
// Send a regular message with video call option
const response = await fetch('/api/chat/patient-send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'I have questions about my treatment',
    videoCallRequest: true,
    callType: 'video',
    autoRedirect: true
  })
});

const data = await response.json();
// If videoCallRequest is true, data will include call session and redirect URL
```

## 🔐 Authentication & Authorization

- All endpoints require patient authentication via Supabase session
- Only patients can access these endpoints (verified via `patients` table)
- Patients can only access their own call data
- Automatic conversation creation for patient-care team relationships

## 🚀 Integration with Frontend

### 1. Message Input Component
```jsx
const MessageInput = ({ conversationId, onVideoCall }) => {
  const [message, setMessage] = useState('');
  const [videoCallRequest, setVideoCallRequest] = useState(false);

  const sendMessage = async () => {
    const response = await fetch('/api/patient/video-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        message,
        videoCallRequest,
        callType: 'video',
        autoRedirect: true
      })
    });

    const data = await response.json();
    if (data.redirect_url) {
      onVideoCall(data.redirect_url);
    }
  };

  return (
    <div>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <label>
        <input 
          type="checkbox" 
          checked={videoCallRequest}
          onChange={(e) => setVideoCallRequest(e.target.checked)}
        />
        Start video call
      </label>
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};
```

### 2. Call Status Component
```jsx
const CallStatus = ({ conversationId }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      const response = await fetch(`/api/patient/video-call/status?conversationId=${conversationId}`);
      const data = await response.json();
      setStatus(data);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  if (status?.activeSession) {
    return <div>Active call in progress...</div>;
  }

  if (status?.canInitiateCall) {
    return <button>Start Video Call</button>;
  }

  return <div>No active call</div>;
};
```

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
- `500` - Internal Server Error

## 🛠️ Setup Instructions

1. **Run the database migration** (if not already done):
   ```sql
   -- Execute scripts/create_video_call_tables.sql
   ```

2. **Deploy the API endpoints**

3. **Update frontend** to use the new patient-specific endpoints

4. **Configure real-time subscriptions** for live updates

The patient video call API system provides a seamless way for patients to initiate video calls through simple messaging, with automatic redirection and comprehensive call management! 🎯
