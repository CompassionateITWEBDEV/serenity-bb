"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Role = "patient" | "doctor" | "nurse" | "counselor";
type Mode = "patient" | "staff";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: Role;
  content: string;
  created_at: string;
  read: boolean;
};

type Props = {
  mode: Mode;
  patientId?: string;
  providerId?: string;
  providerName?: string;
  providerRole?: Exclude<Role, "patient">;
  conversationId?: string; // optional deep-link
};

export default function ChatBox({
  mode,
  patientId,
  providerId,
  providerName,
  providerRole,
  conversationId,
}: Props) {
  const [convId, setConvId] = useState<string | null>(conversationId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  // Ensure conversation for staff when patient/provider are known
  const ensureForStaff = useCallback(async () => {
    if (mode !== "staff") return null;
    if (!patientId || !providerId || !providerName || !providerRole) return null;
    const res = await fetch("/api/chat/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        providerId,
        providerName,
        providerRole,
        providerAvatar: null,
      }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "ensure failed");
    return j.id as string;
  }, [mode, patientId, providerId, providerName, providerRole]);

  // Load messages for a conversation + subscribe realtime
  const loadMessages = useCallback(
    async (cid: string) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", cid)
          .order("created_at", { ascending: true });
        if (error) throw error;
        setMessages((data as Message[]) ?? []);

        // mark read (viewing thread)
        await fetch("/api/chat/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: cid }),
        }).catch(() => {});

        // realtime subscribe
        if (chanRef.current) supabase.removeChannel(chanRef.current);
        const ch = supabase
          .channel(`msg_${cid}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${cid}` }, (payload) => {
            const m = payload.new as Message;
            setMessages((cur) => [...cur, m]);
          })
          .subscribe();
        chanRef.current = ch;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initialize conv id resolution
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (conversationId) {
          if (!cancelled) setConvId(conversationId);
          await loadMessages(conversationId);
          return;
        }
        if (mode === "staff" && !convId) {
          const id = await ensureForStaff();
          if (id && !cancelled) {
            setConvId(id);
            await loadMessages(id);
          }
        }
        // patient mode: wait until first send if no convId
      } catch (e: any) {
        alert(e.message || "Failed to initialize chat");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, mode, ensureForStaff]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Cleanup channel on unmount / conv change
  useEffect(() => {
    return () => {
      if (chanRef.current) supabase.removeChannel(chanRef.current);
      chanRef.current = null;
    };
  }, [convId]);

  async function send() {
    if (!canSend) return;
    setSending(true);
    const content = text.trim();
    try {
      if (mode === "patient" && !convId) {
        // First message from patient: API creates convo + inserts message
        const res = await fetch("/api/chat/patient-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "send failed");
        const newConvId = j.conversationId as string;
        setConvId(newConvId);
        // load history after first send to catch any prior staff messages (rare)
        await loadMessages(newConvId);
      } else {
        // Ensure conv for staff (or patient with existing conv)
        let id = convId;
        if (!id) {
          id = await ensureForStaff();
          if (!id) throw new Error("No conversation available");
          setConvId(id);
          await loadMessages(id);
        }
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: id, content }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "send failed");
        // optimistic add; realtime will also push, but we keep UI snappy.
        setMessages((cur) => [...cur, j.message as Message]);
      }
      setText("");
    } catch (e: any) {
      alert(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  // Simple bubble UI
  return (
    <div className="flex h-[540px] flex-col rounded-lg border">
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <div className="text-xs text-gray-500">Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className="text-xs text-gray-500">No messages yet.</div>
        )}
        {messages.map((m) => {
          const mine = mode === "patient" ? m.sender_role === "patient" : m.sender_role !== "patient";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-900"}`}>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div className={`mt-1 text-[10px] opacity-70 ${mine ? "text-white" : "text-gray-500"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex gap-2 p-3 border-t">
        <input
          className="flex-1 rounded border px-3 py-2"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={mode === "patient" ? "Message your provider..." : "Type your message..."}
        />
        <button
          className="rounded bg-cyan-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={send}
          disabled={!canSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
