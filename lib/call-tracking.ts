import { supabase } from "@/lib/supabase/client";

export type CallStatus = "initiated" | "ringing" | "connected" | "ended" | "missed" | "declined";

export type CallEvent = {
  conversationId: string;
  callerId: string;
  calleeId: string;
  callerName: string;
  calleeName: string;
  callType: "audio" | "video";
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  notes?: string;
};

export class CallTracker {
  private static instance: CallTracker;
  private activeCalls: Map<string, CallEvent> = new Map();

  static getInstance(): CallTracker {
    if (!CallTracker.instance) {
      CallTracker.instance = new CallTracker();
    }
    return CallTracker.instance;
  }

  async logCallEvent(event: CallEvent): Promise<void> {
    try {
      const { error } = await supabase.from("call_history").insert({
        conversation_id: event.conversationId,
        caller_id: event.callerId,
        callee_id: event.calleeId,
        caller_name: event.callerName,
        callee_name: event.calleeName,
        call_type: event.callType,
        status: event.status,
        started_at: event.startedAt || new Date().toISOString(),
        ended_at: event.endedAt || null,
        duration_seconds: event.durationSeconds || 0,
        notes: event.notes || null,
      });

      if (error) {
        // If table doesn't exist, just log a warning and continue
        if (error.code === 'PGRST116' || error.message?.includes('relation "call_history" does not exist')) {
          console.warn("Call history table not found. Call tracking disabled. Run migration 002_add_call_history.sql to enable.");
          return;
        }
        console.error("Failed to log call event:", error);
        return; // Don't throw, just log and continue
      }

      // Track active calls - only delete on explicit end states
      if (event.status === "initiated" || event.status === "ringing" || event.status === "connected") {
        this.activeCalls.set(event.conversationId, event);
      } else if (event.status === "ended" || event.status === "missed" || event.status === "declined") {
        // Only delete on explicit end states, not on temporary failures
        this.activeCalls.delete(event.conversationId);
      }
    } catch (error) {
      console.warn("Call tracking error (table may not exist):", error);
      // Don't throw error, just continue without tracking
    }
  }

  // Method to handle connection recovery
  async handleConnectionRecovery(conversationId: string): Promise<void> {
    try {
      const activeCall = this.activeCalls.get(conversationId);
      if (activeCall) {
        console.log("🔄 Connection recovery detected for call:", conversationId);
        // Update status to connected if it was in a failed state
        if (activeCall.status === "failed" || activeCall.status === "disconnected") {
          await this.updateCallStatus(conversationId, "connected");
        }
      }
    } catch (error) {
      console.warn("Connection recovery handling failed:", error);
    }
  }

  async updateCallStatus(
    conversationId: string,
    status: CallStatus,
    additionalData?: Partial<CallEvent>
  ): Promise<void> {
    try {
      const activeCall = this.activeCalls.get(conversationId);
      if (!activeCall) {
        console.warn("No active call found for conversation:", conversationId);
        // If it's a temporary failure, don't log as error
        if (status === "failed" || status === "disconnected") {
          console.log("Temporary failure detected, call may still be active");
          return;
        }
        return;
      }

      const updatedEvent = {
        ...activeCall,
        ...additionalData,
        status,
        endedAt: status === "ended" || status === "missed" || status === "declined" 
          ? new Date().toISOString() 
          : activeCall.endedAt,
        durationSeconds: this.calculateDuration(activeCall.startedAt, status),
      };

      // Update in database
      const { error } = await supabase
        .from("call_history")
        .update({
          status,
          ended_at: updatedEvent.endedAt,
          duration_seconds: updatedEvent.durationSeconds,
          notes: updatedEvent.notes,
        })
        .eq("conversation_id", conversationId)
        .eq("caller_id", activeCall.callerId);

      if (error) {
        // If table doesn't exist, just log a warning and continue
        if (error.code === 'PGRST116' || error.message?.includes('relation "call_history" does not exist')) {
          console.warn("Call history table not found. Call tracking disabled.");
          return;
        }
        console.error("Failed to update call status:", error);
        return; // Don't throw, just log and continue
      }

      // Update local tracking
      if (status === "ended" || status === "missed" || status === "declined") {
        this.activeCalls.delete(conversationId);
      } else {
        this.activeCalls.set(conversationId, updatedEvent);
      }
    } catch (error) {
      console.warn("Call status update error (table may not exist):", error);
      // Don't throw error, just continue without tracking
    }
  }

  private calculateDuration(startedAt: string | undefined, status: CallStatus): number {
    if (!startedAt || status === "initiated" || status === "ringing") {
      return 0;
    }

    const start = new Date(startedAt);
    const end = new Date();
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  getActiveCalls(): CallEvent[] {
    return Array.from(this.activeCalls.values());
  }

  getActiveCall(conversationId: string): CallEvent | undefined {
    return this.activeCalls.get(conversationId);
  }
}

// Export singleton instance
export const callTracker = CallTracker.getInstance();
