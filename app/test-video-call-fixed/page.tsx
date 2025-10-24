"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";

export default function TestVideoCallFixed() {
  const [open, setOpen] = useState(false);
  const [conversationId] = useState("test-conversation-123");
  const [meId] = useState("test-user-1");
  const [peerUserId] = useState("test-user-2");

  const {
    state,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    toggleMute,
    toggleCamera,
    hangup,
  } = useWebRTCCall({
    open,
    conversationId,
    role: "caller",
    mode: "video",
    meId,
    peerUserId,
    onStatus: (status) => {
      console.log("Call status:", status);
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Video Call Test (Fixed)</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Status: {state.status}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p>Muted: {state.muted ? "Yes" : "No"}</p>
              <p>Camera Off: {state.camOff ? "Yes" : "No"}</p>
              <p>Media Error: {state.mediaError || "None"}</p>
            </div>
            <div>
              <p>Dial Seconds: {state.dialSeconds}</p>
              <p>Network Offline: {state.netOffline ? "Yes" : "No"}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <Button
            onClick={() => setOpen(!open)}
            className="mr-4"
            variant={open ? "destructive" : "default"}
          >
            {open ? "Close Call" : "Start Call"}
          </Button>
          
          {open && (
            <>
              <Button onClick={toggleMute} className="mr-4">
                {state.muted ? "Unmute" : "Mute"}
              </Button>
              <Button onClick={toggleCamera} className="mr-4">
                {state.camOff ? "Turn On Camera" : "Turn Off Camera"}
              </Button>
              <Button onClick={hangup} variant="destructive">
                Hang Up
              </Button>
            </>
          )}
        </div>

        {open && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Local Video</h3>
              <video
                ref={setLocalVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-black rounded"
              />
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Remote Video</h3>
              <video
                ref={setRemoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-black rounded"
              />
              <audio ref={setRemoteAudioRef} autoPlay />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

