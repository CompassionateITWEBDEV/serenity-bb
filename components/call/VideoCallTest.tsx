"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIncomingCall } from "@/hooks/useIncomingCall";
import { supabase } from "@/lib/supabase/client";
import { Video, Phone, MessageSquare } from "lucide-react";

export default function VideoCallTest() {
  const [conversationId, setConversationId] = useState("");
  const [testMessage, setTestMessage] = useState("I would like to start a video call");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  
  const { incomingCall, isRinging, acceptCall, declineCall } = useIncomingCall();

  const testPatientVideoCall = async () => {
    if (!conversationId.trim()) {
      setTestResult("❌ Please enter a conversation ID");
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // Test patient video call initiation
      const response = await fetch("/api/patient/video-call-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversationId.trim(),
          content: testMessage,
          messageType: "text",
          autoInitiateCall: true,
          callType: "video",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult("✅ Patient video call initiated successfully! Staff should receive notification.");
        console.log("Video call initiated:", result);
      } else {
        setTestResult(`❌ Failed to initiate video call: ${result.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testStaffVideoCall = async () => {
    if (!conversationId.trim()) {
      setTestResult("❌ Please enter a conversation ID");
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // Test staff video call initiation
      const response = await fetch("/api/video-call/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversationId.trim(),
          calleeId: "test-patient-id", // This would be the patient ID in real scenario
          callType: "video",
          message: "Staff initiated video call",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult("✅ Staff video call initiated successfully! Patient should receive notification.");
        console.log("Video call invited:", result);
      } else {
        setTestResult(`❌ Failed to initiate staff video call: ${result.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testRealtimeConnection = async () => {
    try {
      // Test Supabase realtime connection
      const channel = supabase.channel("test-video-call", {
        config: { broadcast: { ack: true } },
      });

      await channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setTestResult("✅ Realtime connection established successfully!");
          
          // Send a test message
          channel.send({
            type: "broadcast",
            event: "test-message",
            payload: { message: "Test realtime message", timestamp: new Date().toISOString() },
          });

          // Clean up after 2 seconds
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 2000);
        } else if (status === "CHANNEL_ERROR") {
          setTestResult("❌ Realtime connection failed");
        }
      });
    } catch (error) {
      setTestResult(`❌ Realtime error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Call Connection Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conversationId">Conversation ID</Label>
            <Input
              id="conversationId"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              placeholder="Enter conversation ID for testing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testMessage">Test Message</Label>
            <Input
              id="testMessage"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Message to send with video call"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={testPatientVideoCall}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Test Patient Call
            </Button>

            <Button
              onClick={testStaffVideoCall}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Test Staff Call
            </Button>

            <Button
              onClick={testRealtimeConnection}
              disabled={isLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              Test Realtime
            </Button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-md text-sm ${
              testResult.startsWith("✅") 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {testResult}
            </div>
          )}

          {incomingCall && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-2">Incoming Call Detected!</h3>
              <p className="text-blue-700 text-sm mb-3">
                From: {incomingCall.callerName} ({incomingCall.mode})
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={acceptCall}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Accept
                </Button>
                <Button
                  onClick={declineCall}
                  size="sm"
                  variant="outline"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          {isRinging && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-700 text-sm">🔔 Incoming call is ringing...</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Supabase Client:</span>
              <span className={supabase ? "text-green-600" : "text-red-600"}>
                {supabase ? "✅ Connected" : "❌ Not Connected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Incoming Call Hook:</span>
              <span className={incomingCall ? "text-green-600" : "text-gray-600"}>
                {incomingCall ? "✅ Active" : "⏳ Waiting"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Ringing Status:</span>
              <span className={isRinging ? "text-yellow-600" : "text-gray-600"}>
                {isRinging ? "🔔 Ringing" : "⏸️ Silent"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





















