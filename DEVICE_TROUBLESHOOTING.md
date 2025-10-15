# Video Call Device Troubleshooting

## Flexible Device Support

The video call system now supports flexible device configurations:

### ✅ **Video Calls**
- **With camera + microphone**: Full video call experience
- **With camera only**: Video call without audio input (you can see but not speak)
- **With microphone only**: Audio call (no video)
- **No devices**: ✅ **Always works!** Fallback mode with placeholder video (black screen with "No Camera" text)

### ✅ **Audio Calls**
- **With microphone**: Full audio call experience
- **No microphone**: Not supported (microphone required for audio calls)

## Common "Requested device not found" Errors

### 1. **No Microphone Found (Video Calls)**
**Error**: "No microphone found. Please connect a microphone and try again."

**Solutions**:
- **Option 1**: Connect a USB microphone or headset
- **Option 2**: Continue without microphone (video only)
- **Option 3**: Switch to audio call mode
- Check if microphone is enabled in system settings
- Try refreshing the page and allowing microphone access

### 2. **No Camera Found (Video Calls)**
**Error**: "No camera found. Please connect a camera or switch to audio call."

**Solutions**:
- **Option 1**: Connect a USB camera or use built-in camera
- **Option 2**: Continue without camera (audio only)
- **Option 3**: Switch to audio call mode
- Check if camera is enabled in system settings
- Try refreshing the page and allowing camera access

### 2.5. **No Devices At All (Video Calls)**
**Status**: ✅ **This works automatically!**

**What happens**:
- System creates a placeholder video stream
- Shows black screen with "No Camera" text
- Call continues normally
- Other participant sees the placeholder instead of your video
- You can still hear them (if they have audio)
- Perfect for "view-only" participation

### 3. **Permission Denied**
**Error**: "Permission denied by user" or "Camera and microphone access denied. Please allow access and try again."

**Solutions**:
- **Look for the camera/microphone icon** in your browser's address bar (usually on the left)
- **Click the icon** and select "Allow" for camera and microphone access
- **Refresh the page** and try again
- **Check browser settings** for site permissions
- **Try the "Request Permissions" button** in the error screen
- **Clear browser data** for this site if permissions are stuck

**Browser-specific steps**:
- **Chrome**: Click the lock icon → Camera/Microphone → Allow
- **Firefox**: Click the shield icon → Permissions → Allow camera/microphone
- **Safari**: Safari menu → Settings → Websites → Camera/Microphone → Allow
- **Edge**: Click the lock icon → Permissions → Allow camera/microphone

### 4. **Device in Use**
**Error**: "Camera or microphone is being used by another application."

**Solutions**:
- Close other video calling apps (Zoom, Teams, Skype, etc.)
- Close browser tabs that might be using the camera
- Restart your browser
- Check if any screen recording software is running

### 5. **Device Not Supported**
**Error**: "Camera or microphone doesn't support the required settings."

**Solutions**:
- The system will automatically try with basic settings
- If it still fails, try switching to audio-only mode
- Update your camera/microphone drivers
- Try a different device

## Browser Requirements

### Recommended Browsers (in order):
1. **Chrome/Chromium** - Best WebRTC support
2. **Firefox** - Good WebRTC support  
3. **Edge** - Decent WebRTC support
4. **Safari** - Limited WebRTC support

### Required Features:
- WebRTC support
- Camera and microphone access
- HTTPS connection (required for media access)

## Quick Fixes

### For Users:
1. **Refresh the page** and allow permissions when prompted
2. **Try audio-only mode** if video isn't working
3. **Check device connections** - ensure camera/mic are properly connected
4. **Close other apps** that might be using the camera
5. **Try a different browser** if issues persist

### For Staff:
1. **Test on different devices** to isolate the issue
2. **Check browser console** for detailed error messages
3. **Verify HTTPS** is enabled on the site
4. **Test with different users** to see if it's user-specific

## Error Recovery

The system now includes automatic error recovery:
- **Fallback constraints** - tries different camera/mic settings
- **Device detection** - shows available devices
- **Retry mechanism** - allows users to try again
- **Audio fallback** - switches to audio-only if video fails
- **Canvas fallback** - creates placeholder video when no devices available

## Fallback Mode

When no camera or microphone devices are detected for video calls:
- **Automatic fallback** - creates a canvas-based video stream
- **Placeholder video** - shows black screen with "No Camera" text
- **Call continues** - other participant can still see and hear you
- **Visual indicator** - shows "No devices - using fallback" status
- **Disabled controls** - mute/camera buttons are disabled appropriately

## Support

If issues persist:
1. Check the browser console for detailed error messages
2. Try the "Switch to Audio Call" option
3. Test with different devices/browsers
4. Contact technical support with specific error messages
