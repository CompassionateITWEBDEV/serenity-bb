# Call Flow Documentation

## Incoming Call Flow

### When Someone Calls You

When another user initiates a call to you, here's what happens:

#### 1. **Receiver's Current Location**

The incoming call notification appears regardless of which page the user is currently on:

- **Messages Page**: Shows `IncomingCallBanner` component
- **Call Page**: Shows `IncomingCallNotification` component (overlay)
- **Any Other Page**: Shows `IncomingCallNotification` component ahead (if added globally)

#### 2. **What the Receiver Sees**

A notification overlay with:
- Caller's name and avatar
- Call type (Audio or Video)
- Accept and Decline buttons
- Optional notification sound
- Auto-decline after 30 seconds if not answered

#### 3. **Receiver's Actions**

##### Accept the Call
- Click "Accept" button
- Navigate to call page: `/call/[conversationId]?role=callee&mode=audio|video&peer=[callerId]&peerName=[callerName]`
- WebRTC connection established
- Both users are now in an active call

##### Decline the Call
- Click "Decline" button
- Sends "bye" event to caller
- Caller's call ends with "Call declined" message
- Receiver stays on current page

##### Ignore the Call
- Don't click either button
- After 30 seconds, call auto-declines
- Caller's call ends with "No answer" message

#### 4. **Caller's Status**

While waiting for the callee to answer:
- Caller sees "Ringing..." status on call page
- Can cancel the call at any time
- If callee declines, caller sees "Call declined" and is returned to messages
- If timeout, caller sees "Call ended" and is returned to messages

### Current Page Behaviors

#### On Messages Page (`/dashboard/messages` or `/staff/messages`)
- Incoming call appears as banner at top of page
- Can accept while viewing messages
- Can decline to stay in conversation

#### On Call Page (`/call/[conversationId]`)
- Incoming call appears as full-screen overlay
- **Important**: User must end current call before accepting new call
- New call notification pauses/overlays current call

#### On Other Pages
- Incoming call appears as notification overlay
- Must accept to start the call (redirects to call page)

## Implementation Details

### Components Used

1. **IncomingCallBanner** (`components/call/IncomingCallBanner.tsx`)
   - Used on messages pages
   - Compact banner format
   - Accept/Decline buttons

2. **IncomingCallNotification** (`components/call/IncomingCallNotification.tsx`)
   - Used on call pages and globally
   - Full-screen overlay with backdrop
   - Uses `useIncomingCall` hook
   - Supports sound notifications

### Hooks Used

**useIncomingCall** (`hooks/useIncomingCall.ts`)
- Listens on Supabase channels:
  - Staff: `staff-calls-${userId}`
  - Patients: `user_${userId}`
- Handles both `incoming-call` and `invite` events
- Provides: `incomingCall`, `isRinging`, `acceptCall`, `declineCall`

### Channels and Events

#### Channels
- `user_${userId}` - General user notifications (patients)
- `staff-calls-${userId}` - Staff-specific incoming calls
- `thread_${conversationId}` - WebRTC signaling for active call

#### Events Sent
- `invite` - Initial call invitation (contains: conversationId, fromId, fromName, mode)
- `incoming-call` - Detailed call notification (contains: conversationId, callerId, callerName, mode, timestamp)
- `bye` - Call ended/declined notification

## Best Practices

### For Developers

1. **Always use try-catch** for Supabase channel subscriptions
2. **Don't block on subscriptions** - set reasonable timeouts
3. **Clean up channels** - remove channels when done
4. **Handle failures gracefully** - notification failures shouldn't break calls
5. **Provide user feedback** - show connection status clearly

### For Users

1. **Keep page open** - Don't navigate away while waiting for call
2. **Respond promptly** - 30 second timeout applies
3. **Check sound settings** - Ensure notifications are enabled
4. **Stay connected** - Reliable connection required for good quality

## Troubleshooting

### Call Not Appearing

1. Check browser console for errors
2. Verify user is logged in
3. Check Supabase connection
4. Verify correct channel subscription
5. Check network connectivity

### Call Won't Connect

1. Check WebRTC ICE servers configuration
2. Verify camera/microphone permissions
3. Check firewall/NAT settings
4. Try different network (may need TURN server)

### Notification Not Showing

1. Verify IncomingCallNotification component is imported
2. Check useIncomingCall hook is active
3. Verify correct channel name
4. Check user role (staff vs patient)

