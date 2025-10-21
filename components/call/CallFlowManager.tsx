"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Video, VideoOff, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

interface CallFlowManagerProps {
  conversationId: string;
  userId: string;
  userRole: "patient" | "staff";
  onCallStart: () => void;
  onCallEnd: () => void;
  onNavigateBack: () => void;
}

interface CallSession {
  id: string;
  status: "initiated" | "ringing" | "connected" | "ended" | "declined";
  caller_id: string;
  callee_id: string;
  call_type: "video" | "audio";
  started_at: string;
  ended_at?: string;
  metadata?: any;
}

export default function CallFlowManager({
  conversationId,
  userId,
  userRole,
  onCallStart,
  onCallEnd,
  onNavigateBack
}: CallFlowManagerProps) {
  const [session, setSession] = useState<CallSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current call session
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-call/connect?conversationId=${conversationId}`);
      const data = await response.json();
      
      if (response.ok) {
        setSession(data.session);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch call status");
    }
  }, [conversationId]);

  // Handle call actions
  const handleCallAction = async (action: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/video-call/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          sessionId: session?.id,
          action,
          metadata: {
            user_role: userRole,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSession(data.session);
        
        if (action === "accept" || action === "start_call") {
          onCallStart();
        } else if (action === "end_call" || action === "reject") {
          onCallEnd();
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to perform call action");
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for real-time updates
  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase.channel(`call-flow-${conversationId}`, {
      config: { broadcast: { ack: true } },
    });

    channel
      .on("broadcast", { event: "call-accepted" }, (payload) => {
        console.log("Call accepted:", payload);
        setSession(prev => prev ? { ...prev, status: "connected" } : null);
        onCallStart();
      })
      .on("broadcast", { event: "call-rejected" }, (payload) => {
        console.log("Call rejected:", payload);
        setSession(prev => prev ? { ...prev, status: "declined" } : null);
        onCallEnd();
      })
      .on("broadcast", { event: "call-ringing" }, (payload) => {
        console.log("Call ringing:", payload);
        setSession(prev => prev ? { ...prev, status: "ringing" } : null);
      })
      .on("broadcast", { event: "call-ended" }, (payload) => {
        console.log("Call ended:", payload);
        setSession(prev => prev ? { ...prev, status: "ended" } : null);
        onCallEnd();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, onCallStart, onCallEnd]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Auto-refresh session status
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      if (session.status === "ringing" || session.status === "initiated") {
        fetchSession();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session, fetchSession]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "ringing":
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case "declined":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "initiated":
        return userRole === "patient" ? "Call initiated" : "Incoming call";
      case "ringing":
        return userRole === "patient" ? "Ringing..." : "Call ringing";
      case "connected":
        return "Connected";
      case "declined":
        return "Call declined";
      case "ended":
        return "Call ended";
      default:
        return "Unknown status";
    }
  };

  const renderCallControls = () => {
    if (!session) return null;

    const isCaller = session.caller_id === userId;
    const isCallee = session.callee_id === userId;

    switch (session.status) {
      case "initiated":
        if (isCaller) {
          // Patient initiated call, waiting for staff
          return (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium">Call initiated</p>
                <p className="text-sm text-gray-600">Waiting for staff to respond...</p>
              </div>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => handleCallAction("start_call")}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Start Call
                </Button>
                <Button
                  onClick={() => handleCallAction("end_call")}
                  disabled={isLoading}
                  variant="outline"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          );
        } else if (isCallee) {
          // Staff received call, can accept or reject
          return (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium">Incoming Call</p>
                <p className="text-sm text-gray-600">Patient wants to start a {session.call_type} call</p>
              </div>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => handleCallAction("accept")}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={() => handleCallAction("reject")}
                  disabled={isLoading}
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          );
        }
        break;

      case "ringing":
        if (isCaller) {
          // Patient's call is ringing
          return (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium">Ringing...</p>
                <p className="text-sm text-gray-600">Waiting for staff to answer</p>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={() => handleCallAction("end_call")}
                  disabled={isLoading}
                  variant="outline"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          );
        } else if (isCallee) {
          // Staff's call is ringing (should auto-connect)
          return (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium">Connecting...</p>
                <p className="text-sm text-gray-600">Establishing connection</p>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={() => handleCallAction("end_call")}
                  disabled={isLoading}
                  variant="outline"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              </div>
            </div>
          );
        }
        break;

      case "connected":
        // Call is connected, show end call button
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium text-green-600">Connected</p>
              <p className="text-sm text-gray-600">Call in progress</p>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={() => handleCallAction("end_call")}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        );

      case "declined":
      case "ended":
        // Call ended or declined
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-600">
                {session.status === "declined" ? "Call Declined" : "Call Ended"}
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <Button
                onClick={onNavigateBack}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Messages
              </Button>
            </div>
          </div>
        );
    }

    return null;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-medium text-red-600">Error</p>
        <p className="text-sm text-gray-600 text-center">{error}</p>
        <div className="flex space-x-4">
          <Button onClick={fetchSession} variant="outline">
            Retry
          </Button>
          <Button onClick={onNavigateBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-8">
      {/* Call Status */}
      {session && (
        <div className="flex items-center space-x-3">
          {getStatusIcon(session.status)}
          <Badge variant={session.status === "connected" ? "default" : "secondary"}>
            {getStatusText(session.status)}
          </Badge>
          {session.call_type === "video" && (
            <Video className="h-5 w-5 text-blue-500" />
          )}
          {session.call_type === "audio" && (
            <Phone className="h-5 w-5 text-green-500" />
          )}
        </div>
      )}

      {/* Call Controls */}
      {renderCallControls()}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
}
