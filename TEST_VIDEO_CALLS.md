# 🎥 Video Call Testing Guide - Serenity B9

## Overview
This guide helps you test the video calling functionality between staff and patient users to ensure everything is working properly.

## Test Pages Available

### 1. Video Test Page
**URL:** `http://localhost:3000/video-test.html`
**Purpose:** Test basic camera access and video display

### 2. Call Test Page  
**URL:** `http://localhost:3000/call-test.html`
**Purpose:** Comprehensive testing of camera access and WebRTC functionality

### 3. Actual Call Page
**URL:** `http://localhost:3000/call/[conversationId]?mode=video&role=caller&peer=[peerId]&peerName=[peerName]`
**Purpose:** Test the actual video calling system

## Testing Steps

### Step 1: Basic Camera Test
1. Open `http://localhost:3000/video-test.html`
2. Click "Start Camera"
3. Verify that:
   - Camera permission is requested
   - Video displays in both local and test video boxes
   - No errors in the debug log
   - Video dimensions are shown (e.g., 640x480)

### Step 2: Comprehensive Call Test
1. Open `http://localhost:3000/call-test.html`
2. Click "Test Both Cameras"
3. Verify that:
   - Both staff and patient camera tests pass
   - Video displays properly for both
   - Test results show "✅ Working" for both cameras

### Step 3: WebRTC Test
1. In the same call test page
2. Click "Start WebRTC Test"
3. Verify that:
   - Local stream displays
   - Remote stream (mirror) displays
   - WebRTC connection is established
   - Test results show "✅ Working" for WebRTC

### Step 4: Actual Video Call Test

#### For Staff User:
1. Go to `http://localhost:3000/staff/messages` (or login as staff)
2. Find a conversation with a patient
3. Click the video call button
4. Verify that:
   - Camera permission is requested
   - Local video displays immediately
   - Call status shows "Connecting..."
   - Debug panel shows "Local: ✅"

#### For Patient User:
1. Go to `http://localhost:3000/dashboard/messages` (or login as patient)
2. Accept the incoming video call
3. Verify that:
   - Camera permission is requested
   - Local video displays immediately
   - Remote video (staff) displays when connected
   - Call status shows "Connected"
   - Debug panel shows "Local: ✅ | Remote: ✅"

## Expected Results

### ✅ Success Indicators:
- Camera permission is granted without errors
- Video displays immediately when camera is on
- Both users can see each other's video
- Audio works properly (test with headphones)
- Call controls work (mute, camera toggle, end call)
- Debug panel shows proper status indicators
- No console errors related to video or WebRTC

### ❌ Common Issues and Solutions:

#### Camera Not Working:
- **Issue:** "Failed to access camera/microphone"
- **Solution:** Check browser permissions, try refreshing camera
- **Debug:** Use "Refresh Camera" button in call page

#### Video Not Displaying:
- **Issue:** Camera is on but video screen is blank
- **Solution:** Use "Force Video" button, check console logs
- **Debug:** Check if video elements have srcObject assigned

#### Connection Issues:
- **Issue:** "Waiting for video..." or "Connecting..." stuck
- **Solution:** Use "Force Connect" button, check network
- **Debug:** Check ICE connection state in console

#### Access Denied After Call:
- **Issue:** "Access denied - This page is for patients"
- **Solution:** This should be fixed with role-based redirects
- **Debug:** Check user role detection

## Debug Tools Available

### In Call Page (Development Mode):
- **Force Connect Button:** Forces connection if stuck
- **Force Video Button:** Manually triggers video setup
- **Refresh Camera Button:** Reloads camera if it stops working
- **Debug Panel:** Shows real-time connection status

### Console Logging:
- All video setup steps are logged
- WebRTC connection states are monitored
- Error messages are detailed
- Stream information is displayed

## Browser Compatibility

### Supported Browsers:
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Edge
- ✅ Safari (with limitations)

### Required Features:
- getUserMedia API
- WebRTC (RTCPeerConnection)
- Camera and microphone access

## Troubleshooting

### If Tests Fail:

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for error messages
   - Check if getUserMedia is supported

2. **Check Permissions:**
   - Ensure camera/microphone permissions are granted
   - Try refreshing the page and granting permissions again

3. **Check Network:**
   - Ensure stable internet connection
   - Check if STUN servers are accessible

4. **Check Browser Settings:**
   - Disable ad blockers temporarily
   - Check if camera is being used by another application

### Reset Everything:
1. Stop all video streams
2. Refresh the page
3. Grant permissions again
4. Try the test again

## Test Results Checklist

- [ ] Camera access works for both users
- [ ] Video displays immediately when camera is on
- [ ] Both users can see each other's video
- [ ] Audio works properly
- [ ] Call controls work (mute, camera, end call)
- [ ] No access denied errors after call ends
- [ ] Debug tools work properly
- [ ] Console shows no critical errors

## Next Steps

If all tests pass:
1. The video calling system is working properly
2. Both staff and patient can video call each other
3. The system is ready for production use

If tests fail:
1. Check the specific error messages
2. Use the debug tools to identify the issue
3. Check browser compatibility and permissions
4. Contact support if issues persist

---

**Note:** This testing should be done in a real browser environment with actual camera and microphone access. The test pages help verify that the underlying technology works before testing the actual call functionality.
