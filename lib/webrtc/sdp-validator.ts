"use client";

/**
 * Advanced SDP Validator and Fixer
 * Handles specific WebRTC SDP parsing errors
 */

export interface SDPValidationResult {
  isValid: boolean;
  fixedSDP: string;
  errors: string[];
  warnings: string[];
}

/**
 * Validates and fixes SDP to prevent parsing errors
 */
export function validateAndFixSDP(sdp: string): SDPValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!sdp || typeof sdp !== 'string') {
    return {
      isValid: false,
      fixedSDP: '',
      errors: ['SDP is empty or not a string'],
      warnings: []
    };
  }

  let fixedSDP = sdp;

  // 1. Basic cleaning
  fixedSDP = fixedSDP.replace(/\0/g, ''); // Remove null bytes
  fixedSDP = fixedSDP.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // Fix line endings

  // 2. Split into lines
  const lines = fixedSDP.split('\n');
  const processedLines: string[] = [];
  
  let hasVersion = false;
  let hasOrigin = false;
  let hasSession = false;
  let hasTime = false;
  let hasConnection = false;
  let mediaLines: string[] = [];
  let currentMediaBlock: string[] = [];
  let inMediaBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inMediaBlock) {
        currentMediaBlock.push('');
      } else {
        processedLines.push('');
      }
      continue;
    }

    // Session-level lines
    if (line.startsWith('v=')) {
      hasVersion = true;
      processedLines.push(line);
    } else if (line.startsWith('o=')) {
      hasOrigin = true;
      processedLines.push(line);
    } else if (line.startsWith('s=')) {
      hasSession = true;
      processedLines.push(line);
    } else if (line.startsWith('t=')) {
      hasTime = true;
      processedLines.push(line);
    } else if (line.startsWith('c=')) {
      if (!inMediaBlock) {
        hasConnection = true;
        processedLines.push(line);
      } else {
        // This is a media-level connection line
        currentMediaBlock.push(line);
      }
    } else if (line.startsWith('m=')) {
      // Start of media block
      if (inMediaBlock) {
        // Close previous media block
        if (currentMediaBlock.length > 0) {
          mediaLines.push(...currentMediaBlock);
          mediaLines.push('');
        }
      }
      
      currentMediaBlock = [line];
      inMediaBlock = true;
    } else if (line.startsWith('a=')) {
      if (inMediaBlock) {
        currentMediaBlock.push(line);
      } else {
        // Session-level attribute
        processedLines.push(line);
      }
    } else {
      // Other lines
      if (inMediaBlock) {
        currentMediaBlock.push(line);
      } else {
        processedLines.push(line);
      }
    }
  }

  // Close final media block
  if (inMediaBlock && currentMediaBlock.length > 0) {
    mediaLines.push(...currentMediaBlock);
  }

  // 3. Validate required fields
  if (!hasVersion) {
    errors.push('Missing version line (v=)');
    processedLines.unshift('v=0');
  }

  if (!hasOrigin) {
    errors.push('Missing origin line (o=)');
    processedLines.splice(1, 0, 'o=- 0 0 IN IP4 127.0.0.1');
  }

  if (!hasSession) {
    errors.push('Missing session line (s=)');
    processedLines.splice(2, 0, 's=-');
  }

  if (!hasTime) {
    errors.push('Missing time line (t=)');
    processedLines.splice(3, 0, 't=0 0');
  }

  // 4. Check for orphaned c= lines
  const orphanedCLines = mediaLines.filter(line => 
    line.startsWith('c=') && !line.includes('m=') && 
    !mediaLines[mediaLines.indexOf(line) - 1]?.startsWith('m=')
  );
  
  if (orphanedCLines.length > 0) {
    errors.push(`Found ${orphanedCLines.length} orphaned c= lines without m= lines`);
    // Remove orphaned c= lines
    mediaLines = mediaLines.filter(line => !orphanedCLines.includes(line));
  }

  // 5. Ensure we have media lines
  if (mediaLines.length === 0 || !mediaLines.some(line => line.startsWith('m='))) {
    errors.push('No media lines found');
    // Add minimal audio m-line
    mediaLines = [
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'c=IN IP4 0.0.0.0',
      'a=rtcp:9 IN IP4 0.0.0.0',
      'a=sendrecv'
    ];
  }

  // 6. Reconstruct SDP
  const allLines = [...processedLines, ...mediaLines];
  fixedSDP = allLines.join('\n');

  // 7. Final validation
  if (!fixedSDP.includes('m=')) {
    errors.push('SDP still has no media lines after fixing');
  }

  // 8. Check for common issues
  const mLineCount = (fixedSDP.match(/^m=/gm) || []).length;
  if (mLineCount === 0) {
    errors.push('No media lines in final SDP');
  }

  // 9. Validate BUNDLE group
  const bundleGroup = fixedSDP.match(/^a=group:BUNDLE\s+(.+)$/m);
  if (bundleGroup) {
    const bundleIds = bundleGroup[1].split(/\s+/);
    const mLineIds = fixedSDP.match(/^a=mid:(\d+)$/gm)?.map(m => m.replace('a=mid:', '')) || [];
    
    // Check if all BUNDLE IDs have corresponding m-lines
    const missingIds = bundleIds.filter(id => !mLineIds.includes(id));
    if (missingIds.length > 0) {
      warnings.push(`BUNDLE group references non-existent mids: ${missingIds.join(', ')}`);
    }
  }

  // 10. Validate msid-semantic
  const msidSemantic = fixedSDP.match(/^a=msid-semantic:\s+WMS\s+(.+)$/m);
  if (msidSemantic) {
    const wmsId = msidSemantic[1].trim();
    if (!wmsId || wmsId === '') {
      warnings.push('msid-semantic WMS has empty ID');
    }
  }

  const cLineCount = (fixedSDP.match(/^c=/gm) || []).length;
  const orphanedCLinesCount = fixedSDP.split('\n').filter((line, index, lines) => {
    if (!line.startsWith('c=')) return false;
    const prevLine = lines[index - 1];
    return !prevLine?.startsWith('m=');
  }).length;

  if (orphanedCLinesCount > 0) {
    errors.push(`${orphanedCLinesCount} orphaned c= lines still present`);
  }

  return {
    isValid: errors.length === 0,
    fixedSDP,
    errors,
    warnings
  };
}

/**
 * Creates a minimal valid SDP as fallback
 */
export function createMinimalSDP(type: 'offer' | 'answer', hasVideo: boolean = false): string {
  const mediaLines = [
    'm=audio 9 UDP/TLS/RTP/SAVPF 111',
    'c=IN IP4 0.0.0.0',
    'a=rtcp:9 IN IP4 0.0.0.0',
    'a=ice-ufrag:test',
    'a=ice-pwd:test',
    'a=fingerprint:sha-256 test',
    'a=setup:actpass',
    'a=mid:0',
    'a=sendrecv',
    'a=rtcp-mux',
    'a=rtpmap:111 opus/48000/2',
    'a=rtcp-fb:111 transport-cc',
    'a=fmtp:111 minptime=10;useinbandfec=1'
  ];

  if (hasVideo) {
    mediaLines.push(
      '',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'c=IN IP4 0.0.0.0',
      'a=rtcp:9 IN IP4 0.0.0.0',
      'a=ice-ufrag:test',
      'a=ice-pwd:test',
      'a=fingerprint:sha-256 test',
      'a=setup:actpass',
      'a=mid:1',
      'a=sendrecv',
      'a=rtcp-mux',
      'a=rtcp-rsize',
      'a=rtpmap:96 VP8/90000',
      'a=rtcp-fb:96 goog-remb',
      'a=rtcp-fb:96 transport-cc',
      'a=rtcp-fb:96 ccm fir',
      'a=rtcp-fb:96 nack',
      'a=rtcp-fb:96 nack pli',
      'a=fmtp:96 max-fr=30;max-fs=8192'
    );
  }

  return [
    'v=0',
    'o=- 0 0 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    ...mediaLines
  ].join('\n');
}
