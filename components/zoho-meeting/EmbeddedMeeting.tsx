"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Minimize2, Maximize2 } from "lucide-react";

interface EmbeddedMeetingProps {
  meetingUrl: string;
  open: boolean;
  onClose: () => void;
  callerName?: string;
}

export function EmbeddedMeeting({ 
  meetingUrl, 
  open, 
  onClose,
  callerName = "Meeting"
}: EmbeddedMeetingProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: '100%', height: '100%' });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Adjust iframe dimensions based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (isMinimized) {
        setDimensions({ width: '400px', height: '300px' });
      } else {
        setDimensions({ width: '100%', height: 'calc(100vh - 120px)' });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isMinimized]);

  return (
    <>
      {/* Fullscreen Modal */}
      <Dialog open={open && !isMinimized} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                {callerName}'s Meeting
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(true)}
                  className="rounded-full"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 relative">
            <iframe
              ref={iframeRef}
              src={meetingUrl}
              style={{
                width: dimensions.width,
                height: dimensions.height,
                border: 'none',
              }}
              allow="microphone; camera; fullscreen; display-capture"
              className="w-full h-full"
              title="Zoho Meeting"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Minimized Window */}
      {open && isMinimized && (
        <div 
          className="fixed bottom-4 right-4 z-50 w-[400px] h-[300px] bg-white dark:bg-gray-900 border rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Minimized Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                {callerName}'s Meeting
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(false)}
                className="h-7 w-7 rounded-full"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 rounded-full"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Minimized iframe */}
          <div className="relative w-full h-[calc(100%-40px)]">
            <iframe
              src={meetingUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="microphone; camera; fullscreen; display-capture"
              className="w-full h-full"
              title="Zoho Meeting - Minimized"
            />
          </div>
        </div>
      )}
    </>
  );
}

