"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Video, 
  Mic, 
  VideoOff,
  CheckCircle,
  AlertCircle,
  Users
} from "lucide-react";

interface CallModeSelectorProps {
  onSelectMode: (mode: "audio" | "video") => void;
  onCancel: () => void;
  peerName: string;
  hasAudio: boolean | null;
  hasVideo: boolean | null;
  isCheckingDevices: boolean;
}

export default function CallModeSelector({
  onSelectMode,
  onCancel,
  peerName,
  hasAudio,
  hasVideo,
  isCheckingDevices
}: CallModeSelectorProps) {
  const audioAvailable = hasAudio === true;
  const videoAvailable = hasVideo === true;
  const noDevices = hasAudio === false && hasVideo === false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Start a Call</h1>
          <p className="text-blue-200">Choose how you'd like to connect with {peerName}</p>
        </div>

        {/* Device Status */}
        <div className="mb-8">
          <Card className="bg-black/20 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Device Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCheckingDevices ? (
                <div className="flex items-center gap-2 text-blue-300">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  Checking available devices...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      <span>Microphone</span>
                    </div>
                    {audioAvailable ? (
                      <Badge variant="secondary" className="bg-green-500 text-green-900">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-500 text-red-900">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Available
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span>Camera</span>
                    </div>
                    {videoAvailable ? (
                      <Badge variant="secondary" className="bg-green-500 text-green-900">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-500 text-red-900">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Available
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Call Mode Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Audio Call Option */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
              audioAvailable || noDevices 
                ? 'bg-blue-600/20 border-blue-500 hover:bg-blue-600/30' 
                : 'bg-gray-600/20 border-gray-500 opacity-50 cursor-not-allowed'
            }`}
            onClick={() => (audioAvailable || noDevices) && onSelectMode("audio")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center">
                <Phone className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl">Voice Call</CardTitle>
              <CardDescription className="text-blue-200">
                Audio-only conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  <span>Microphone required</span>
                </div>
                <div className="flex items-center gap-2">
                  <VideoOff className="h-4 w-4" />
                  <span>No camera needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Works on any device</span>
                </div>
              </div>
              
              {!audioAvailable && !noDevices && (
                <div className="mt-4 p-2 bg-red-500/20 rounded text-red-200 text-xs">
                  Microphone not available
                </div>
              )}
              
              {noDevices && (
                <div className="mt-4 p-2 bg-yellow-500/20 rounded text-yellow-200 text-xs">
                  No devices detected - will use fallback mode
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Call Option */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
              videoAvailable 
                ? 'bg-purple-600/20 border-purple-500 hover:bg-purple-600/30' 
                : 'bg-gray-600/20 border-gray-500 opacity-50 cursor-not-allowed'
            }`}
            onClick={() => videoAvailable && onSelectMode("video")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-purple-600 rounded-full w-16 h-16 flex items-center justify-center">
                <Video className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl">Video Call</CardTitle>
              <CardDescription className="text-purple-200">
                Face-to-face conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <span>Camera required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  <span>Microphone recommended</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Best experience</span>
                </div>
              </div>
              
              {!videoAvailable && (
                <div className="mt-4 p-2 bg-red-500/20 rounded text-red-200 text-xs">
                  Camera not available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-blue-500 text-blue-300 hover:bg-blue-500/20"
          >
            Cancel
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-blue-300">
          <p>
            Don't have a camera? No problem! Voice calls work on any device with a microphone.
          </p>
          <p className="mt-1">
            If you don't have a microphone, you can still join and listen to the conversation.
          </p>
        </div>
      </div>
    </div>
  );
}
