"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { supabase, ensureSession, logout } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import type { ProviderRole, Conversation, MessageRow } from "@/lib/chat";
import {
  listConversationsForProvider,
  listMessages,
  sendMessage as sendMsg,
  markRead,
  subscribeThread,
  subscribeInbox,
} from "@/lib/chat";

type PatientAssigned = { user_id: string; full_name: string | null; email: string | null; avatar: string | null };

function initials(name?: string | null) {
  const s = (name ?? "").trim();
  if (!s) return "U";
  return s.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function mapStaffRole(role?: string | null, dept?: string | null): ProviderRole {
  const r = (role ?? "").toLowerCase(), d = (dept ?? "").toLowerCase();
  if (r.includes("doc") || r.includes("physician") || d.includes("medical")) return "doctor";
  if (r.includes("counsel") || r.includes("therap") || d.includes("therapy")) return "counselor";
  return "nurse";
}

export default function StaffMessagesPage() {
  const router = useRouter();

  // me
  const [meId, setMeId] = useState<string | null>(null);
  const [meName, setMeName] = useState("Me");
  const [meRole, setMeRole] = useState<ProviderRole>("nurse");

  // data
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [errorText, setErrorText] = useState<string | null>(null);

  // compose
  const [compose, setCompose] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // load me + data
  useEffect(() => {
    let mounted = true;

    (async () => {
      const session = await ensureSession({ graceMs: 200, fallbackMs: 1200 });
      if (!session) {
        router.replace("/staff/login?redirect=/staff/messages");
        return;
      }
      const uid = session.user.id;
      setMeId(uid);

      const u = (await supabase.auth.getUser()).data.user;
      if (u) setMeName((u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || "Me");

      const staff = await supabase
        .from("staff")
        .select("role, department, first_name, last_name")
        .eq("user_id", uid)
        .maybeSingle();

      const role = staff.error ? null : ((staff.data?.role as string | null) ?? null);
      const dept = staff.error ? null : ((staff.data?.department as string | null) ?? null);
      setMeRole(mapStaffRole(role, dept));
      const first = (staff.data?.first_name ?? "").trim();
      const last = (staff.data?.last_name ?? "").trim();
      if (first || last) setMeName(`${first} ${last}`.trim());

      try {
        const list = await listConversationsForProvider(uid);
        if (mounted) setConvs(list);
      } catch (e: any) {
        setErrorText(e?.message ?? "Failed to load conversations");
      }

      // deep-link (?open=)
      if (typeof window !== "undefined") {
        const id = new URLSearchParams(window.location.search).get("open");
        if (id) setSelectedId(id);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  // unread via view (optional) + inbox live bump
  useEffect(() => {
    if (!meId) return;

    // Initial unread snapshot via view (optional)
    (async () => {
      const u = await supabase
        .from("v_staff_dm_unread")
        .select("conversation_id, unread_from_patient")
        .eq("provider_id", meId);
      if (!u.error) {
        const map: Record<string, number> = {};
        for (const row of (u.data as any[]) ?? []) map[row.conversation_id] = Number(row.unread_from_patient) || 0;
        setUnreadMap(map);
      }
    })();

    // Realtime inbox bump
    const offInbox = subscribeInbox(meId, (m) => {
      setUnreadMap((prev) => {
        if (selectedId === m.conversation_id) return prev;
        const curr = prev[m.conversation_id] ?? 0;
        return { ...prev, [m.conversation_id]: curr + 1 };
      });
      // ensure list reflects latest ordering
      setConvs((cur) =>
        cur
          .map((c) => (c.id === m.conversation_id ? { ...c, last_message: m.content, updated_at: m.created_at } : c))
          .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      );
    });

    return () => {
      offInbox();
    };
  }, [meId, selectedId]);

  // open thread
  useEffect(() => {
    if (!selectedId) return;
    let alive = true;

    (async () => {
      const data = await listMessages(selectedId).catch((e) => {
        setErrorText(e?.message ?? "Failed to load messages");
        return [] as MessageRow[];
      });
      if (alive) setMsgs(data);
      await markRead(selectedId, meRole).catch(() => {});
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
      );
    })();

    const off = subscribeThread(
      selectedId,
      async (m) => {
        setMsgs((cur) => [...cur, m]);
        if (m.sender_role === "patient") {
          await markRead(selectedId, meRole).catch(() => {});
          setUnreadMap((prev) => ({ ...prev, [selectedId]: 0 }));
        }
        requestAnimationFrame(() =>
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
        );
      },
      async () => {
        const data = await listMessages(selectedId).catch(() => [] as MessageRow[]);
        setMsgs(data);
      }
    );

    return () => {
      alive = false;
      off();
    };
  }, [selectedId, meRole]);

  async function handleSend() {
    if (!selectedId || !meId || !compose.trim()) return;
    const conv = convs.find((c) => c.id === selectedId);
    if (!conv) return;

    const content = compose.trim();
    setCompose("");

    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: selectedId,
      patient_id: conv.patient_id,
      sender_id: meId,
      sender_name: meName,
      sender_role: meRole,
      content,
      created_at: new Date().toISOString(),
      read: true,
      urgent: false,
    };
    setMsgs((m) => [...m, optimistic]);

    try {
      await sendMsg({
        conversation_id: selectedId,
        patient_id: conv.patient_id,
        sender_id: meId,
        sender_name: meName,
        sender_role: meRole,
        content,
      });
      // move convo to top with latest preview
      setConvs((cur) =>
        cur
          .map((c) => (c.id === selectedId ? { ...c, last_message: content, updated_at: optimistic.created_at } : c))
          .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      );
    } catch (e: any) {
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      setErrorText(e?.message ?? "Send failed");
    }
  }

  // UI helpers
  const noConversations = convs.length === 0;
  const selectedUnread = unreadMap[selectedId ?? ""] ?? 0;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Direct Messages (LIVE)</h1>
        <div className="flex items-center gap-2">
          {errorText && <span className="text-xs text-red-600">{errorText}</span>}
          <Button variant="outline" size="sm" onClick={async () => { await logout(); router.refresh(); }}>
            Logout
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Conversations */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle>Chats</CardTitle></CardHeader>
          <CardContent className="p-0">
            {noConversations ? (
              <div className="p-6 text-sm text-gray-500">No conversations.</div>
            ) : (
              convs.map((c) => {
                const active = selectedId === c.id;
                const u = unreadMap[c.id] ?? 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full p-4 text-left flex items-center justify-between border-l-4 ${
                      active ? "border-cyan-500 bg-cyan-50" : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.patient_name ?? c.patient_email ?? "Patient"}</div>
                      <div className="text-xs text-gray-500 truncate">{c.last_message ?? "—"}</div>
                    </div>
                    {u > 0 && <Badge>{u}</Badge>}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Thread */}
        <Card className="md:col-span-2 flex flex-col">
          {!selectedId ? (
            <CardContent className="flex-1 grid place-items-center text-sm text-gray-500">
              Select a conversation
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-base">
                  {convs.find((c) => c.id === selectedId)?.patient_name ??
                    convs.find((c) => c.id === selectedId)?.patient_email ??
                    "Patient"}
                  {selectedUnread > 0 && <Badge className="ml-2">+{selectedUnread}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent ref={listRef} className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {msgs.map((m) => {
                    const own = m.sender_id === meId;
                    return (
                      <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${own ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-900"}`}>
                          <div className="text-[10px] opacity-60 mb-1">{own ? meName : "Patient"}</div>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                          <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                  {msgs.length === 0 && <div className="text-sm text-gray-500">No messages yet.</div>}
                </div>
              </CardContent>

              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message…"
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    className="min-h-[40px] max-h-[120px] flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                  />
                  <Button onClick={handleSend} disabled={!compose.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
