"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  ArrowLeft,
  Settings,
  Maximize2,
  Minimize2,
} from "lucide-react";
import CallFlowManager from "@/components/call/CallFlowManager";
import { determineUserRole, type UserRole } from "@/lib/user-role";

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

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: UserRole;
}

export default function ImprovedCallPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = params.conversationId as string;
  
  const [user, setUser] = useState<UserInfo | null>(null);
  const [peerInfo, setPeerInfo] = useState<UserInfo | null>(null);
  const [session, setSession] = useState<CallSession | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user info
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/login");
          return;
        }

        const userRole = await determineUserRole(authUser.id);
        setUser({
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email || "User",
          email: authUser.email || "",
          avatar_url: authUser.user_metadata?.avatar_url,
          role: userRole
        });
      } catch (err) {
        setError("Failed to get user information");
      }
    };

    getUser();
  }, [router]);

  // Get peer info and session
  useEffect(() => {
    if (!user || !conversationId) return;

    const getCallInfo = async () => {
      try {
        // Get conversation details
        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .select("id, patient_id, provider_id, provider_name, provider_role, provider_avatar")
          .eq("id", conversationId)
          .single();

        if (convError) {
          setError("Conversation not found");
          return;
        }

        // Determine peer info
        const isPatient = user.role === "patient";
        const peerId = isPatient ? conversation.provider_id : conversation.patient_id;
        
        if (isPatient) {
          setPeerInfo({
            id: conversation.provider_id,
            name: conversation.provider_name || "Staff",
            email: "",
            avatar_url: conversation.provider_avatar,
            role: "staff"
          });
        } else {
          // For staff, get patient info
          const { data: patient, error: patientError } = await supabase
            .from("patients")
            .select("user_id, first_name, last_name, email, avatar_url")
            .eq("user_id", conversation.patient_id)
            .single();

          if (!patientError && patient) {
            setPeerInfo({
              id: patient.user_id,
              name: [patient.first_name, patient.last_name].filter(Boolean).join(" ") || patient.email || "Patient",
              email: patient.email || "",
              avatar_url: patient.avatar_url,
              role: "patient"
            });
          }
        }

        // Get current call session
        const response = await fetch(`/api/video-call/connect?conversationId=${conversationId}`);
        const data = await response.json();
        
        if (response.ok) {
          setSession(data.session);
        }

      } catch (err) {
        setError("Failed to load call information");
      } finally {
        setIsLoading(false);
      }
    };

    getCallInfo();
  }, [user, conversationId]);

  // Handle call start
  const handleCallStart = useCallback(() => {
    setIsInCall(true);
    // Here you would integrate with the existing WebRTC logic
    console.log("Call started - integrating with WebRTC");
  }, []);

  // Handle call end
  const handleCallEnd = useCallback(() => {
    setIsInCall(false);
    setSession(null);
    // Here you would clean up WebRTC resources
    console.log("Call ended - cleaning up WebRTC");
  }, []);

  // Handle navigation back
  const handleNavigateBack = useCallback(() => {
    const userRole = user?.role;
    if (userRole === "patient") {
      router.push("/dashboard/messages");
    } else {
      router.push("/staff/messages");
    }
  }, [router, user]);

  // Listen for real-time call updates
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`call-updates-${conversationId}`, {
      config: { broadcast: { ack: true } },
    });

    channel
      .on("broadcast", { event: "call-accepted" }, (payload) => {
        console.log("Call accepted:", payload);
        setSession(prev => prev ? { ...prev, status: "connected" } : null);
        setIsInCall(true);
      })
      .on("broadcast", { event: "call-rejected" }, (payload) => {
        console.log("Call rejected:", payload);
        setSession(prev => prev ? { ...prev, status: "declined" } : null);
        setIsInCall(false);
      })
      .on("broadcast", { event: "call-ended" }, (payload) => {
        console.log("Call ended:", payload);
        setSession(prev => prev ? { ...prev, status: "ended" } : null);
        setIsInCall(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleNavigateBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !peerInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading user information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleNavigateBack}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={peerInfo.avatar_url} />
                  <AvatarFallback>
                    {peerInfo.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{peerInfo.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{peerInfo.role}</p>
                </div>
              </div>
            </div>
            
            {session && (
              <div className="flex items-center space-x-2">
                <Badge variant={session.status === "connected" ? "default" : "secondary"}>
                  {session.call_type === "video" ? (
                    <Video className="h-3 w-3 mr-1" />
                  ) : (
                    <Phone className="h-3 w-3 mr-1" />
                  )}
                  {session.status}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isInCall ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Call Connected</h2>
            <p className="text-gray-600 mb-8">
              {session?.call_type === "video" ? "Video call in progress" : "Audio call in progress"}
            </p>
            
            {/* WebRTC Video/Audio Interface would go here */}
            <div className="bg-gray-100 rounded-lg p-8 mb-8">
              <p className="text-gray-600">
                WebRTC interface will be integrated here
              </p>
            </div>

            {/* Call Controls */}
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => {
                  // Handle mute/unmute
                }}
                variant="outline"
                size="lg"
              >
                <Mic className="h-5 w-5" />
              </Button>
              
              {session?.call_type === "video" && (
                <Button
                  onClick={() => {
                    // Handle video on/off
                  }}
                  variant="outline"
                  size="lg"
                >
                  <Video className="h-5 w-5" />
                </Button>
              )}
              
              <Button
                onClick={() => {
                  // Handle screen share
                }}
                variant="outline"
                size="lg"
              >
                <Monitor className="h-5 w-5" />
              </Button>
              
              <Button
                onClick={() => {
                  // End call
                  handleCallEnd();
                }}
                className="bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          <CallFlowManager
            conversationId={conversationId}
            userId={user.id}
            userRole={user.role}
            onCallStart={handleCallStart}
            onCallEnd={handleCallEnd}
            onNavigateBack={handleNavigateBack}
          />
        )}
      </div>
    </div>
  );
}
