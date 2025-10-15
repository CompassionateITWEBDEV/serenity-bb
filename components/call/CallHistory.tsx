"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, Video, PhoneOff, Clock, CheckCircle, XCircle } from "lucide-react";

type CallHistoryEntry = {
  id: number;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  caller_name: string;
  callee_name: string;
  call_type: "audio" | "video";
  status: "initiated" | "ringing" | "connected" | "ended" | "missed" | "declined";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  notes: string | null;
};

type CallHistoryProps = {
  userId: string;
  conversationId?: string;
  limit?: number;
};

export default function CallHistory({ userId, conversationId, limit = 10 }: CallHistoryProps) {
  const [calls, setCalls] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCallHistory();
  }, [userId, conversationId, limit]);

  const loadCallHistory = async () => {
    try {
      let query = supabase
        .from("call_history")
        .select("*")
        .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      }

      const { data, error } = await query;
      if (error) {
        // If table doesn't exist, just show empty state
        if (error.code === 'PGRST116' || error.message?.includes('relation "call_history" does not exist')) {
          console.warn("Call history table not found. Run migration 002_add_call_history.sql to enable call history.");
          setCalls([]);
          return;
        }
        throw error;
      }
      setCalls(data || []);
    } catch (error) {
      console.error("Failed to load call history:", error);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
      case "ended":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "missed":
      case "declined":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "ringing":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: "bg-green-100 text-green-800",
      ended: "bg-gray-100 text-gray-800",
      missed: "bg-red-100 text-red-800",
      declined: "bg-red-100 text-red-800",
      ringing: "bg-yellow-100 text-yellow-800",
      initiated: "bg-blue-100 text-blue-800",
    };
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No call history yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {calls.map((call) => {
            const isOutgoing = call.caller_id === userId;
            const otherPerson = isOutgoing ? call.callee_name : call.caller_name;
            const otherPersonId = isOutgoing ? call.callee_id : call.caller_id;

            return (
              <div key={call.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {otherPerson.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{otherPerson}</p>
                    <div className="flex items-center gap-1">
                      {call.call_type === "video" ? (
                        <Video className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Phone className="h-4 w-4 text-green-500" />
                      )}
                      {getStatusIcon(call.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{formatDate(call.started_at)}</span>
                    {call.status === "connected" && call.duration_seconds > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(call.duration_seconds)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadge(call.status)}>
                    {call.status}
                  </Badge>
                  
                  {call.status === "connected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const url = `/call/${call.conversation_id}?role=caller&mode=${call.call_type}&peer=${encodeURIComponent(otherPersonId)}&peerName=${encodeURIComponent(otherPerson)}`;
                        window.location.href = url;
                      }}
                    >
                      Call Again
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
