/**
 * Script to apply WebRTC SDP fix to existing call pages
 * Run this to automatically fix the InvalidModificationError
 */

const fs = require('fs');
const path = require('path');

// Files to patch
const filesToPatch = [
  'app/call/audio/[conversationId]/page.tsx',
  'app/call/video/[conversationId]/page.tsx'
];

// Import statement to add
const importStatement = `import { applyWebRTCFix } from "@/lib/webrtc/quick-fix";\n`;

// Code to add after RTCPeerConnection creation
const fixCode = `
    // Apply WebRTC SDP fix to prevent InvalidModificationError
    pc = applyWebRTCFix(pc);
`;

function applyFix() {
  console.log('🔧 Applying WebRTC SDP fix to call pages...');

  filesToPatch.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Check if fix is already applied
    if (content.includes('applyWebRTCFix')) {
      console.log(`✅ Fix already applied to ${filePath}`);
      return;
    }

    // Add import statement
    if (!content.includes('@/lib/webrtc/quick-fix')) {
      content = importStatement + content;
    }

    // Find RTCPeerConnection creation and add fix
    const pcCreationRegex = /(const pc = new RTCPeerConnection\([^)]*\);)/g;
    content = content.replace(pcCreationRegex, `$1${fixCode}`);

    // Also handle pcRef.current = new RTCPeerConnection
    const pcRefCreationRegex = /(pcRef\.current = new RTCPeerConnection\([^)]*\);)/g;
    content = content.replace(pcRefCreationRegex, `$1${fixCode.replace('pc = ', 'pcRef.current = ')}`);

    // Write back to file
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Applied fix to ${filePath}`);
  });

  console.log('🎉 WebRTC SDP fix applied successfully!');
  console.log('📝 The InvalidModificationError should now be resolved.');
}

// Run the fix
applyFix();
