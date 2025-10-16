"use client";

import React from 'react';
import { Mic, MicOff, Video, VideoOff, MessageSquare, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DeviceStatusIndicatorProps {
  hasMicrophone: boolean;
  hasCamera: boolean;
  mode: 'audio' | 'video';
  isFallbackMode: boolean;
  onSwitchToChat: () => void;
}

export default function DeviceStatusIndicator({
  hasMicrophone,
  hasCamera,
  mode,
  isFallbackMode,
  onSwitchToChat
}: DeviceStatusIndicatorProps) {
  const getStatusMessage = () => {
    if (isFallbackMode) {
      return "Using fallback mode - no devices detected";
    }
    
    if (mode === 'video') {
      if (!hasCamera && !hasMicrophone) {
        return "No camera or microphone - using text chat recommended";
      }
      if (!hasCamera) {
        return "No camera - audio only";
      }
      if (!hasMicrophone) {
        return "No microphone - video only";
      }
    } else {
      if (!hasMicrophone) {
        return "No microphone - listen only mode";
      }
    }
    
    return "All devices working";
  };

  const getAccessibilityLevel = () => {
    if (hasMicrophone && hasCamera) return "full";
    if (hasMicrophone || hasCamera) return "partial";
    return "text-only";
  };

  const accessibilityLevel = getAccessibilityLevel();

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {hasMicrophone ? (
              <Mic className="h-4 w-4 text-green-600" />
            ) : (
              <MicOff className="h-4 w-4 text-red-500" />
            )}
            {mode === 'video' && (
              hasCamera ? (
                <Video className="h-4 w-4 text-green-600" />
              ) : (
                <VideoOff className="h-4 w-4 text-red-500" />
              )
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getStatusMessage()}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant={accessibilityLevel === 'full' ? 'default' : accessibilityLevel === 'partial' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {accessibilityLevel === 'full' ? 'Full Access' : 
                 accessibilityLevel === 'partial' ? 'Partial Access' : 'Text Only'}
              </Badge>
            </div>
          </div>
        </div>

        {accessibilityLevel === 'text-only' && (
          <button
            onClick={onSwitchToChat}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            Switch to Chat
          </button>
        )}
      </div>

      {accessibilityLevel !== 'full' && (
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          <p><strong>Accessibility Options:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            {!hasMicrophone && (
              <li>Use text chat for communication</li>
            )}
            {!hasCamera && mode === 'video' && (
              <li>Switch to audio call mode</li>
            )}
            <li>Use voice notes in chat for audio messages</li>
            <li>Share files and images through chat</li>
          </ul>
        </div>
      )}
    </div>
  );
}
