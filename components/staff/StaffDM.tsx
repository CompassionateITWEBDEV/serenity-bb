"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Plus, Search } from "lucide-react";

type StaffRow = { user_id: string; first_name: string | null; last_name: string | null; email: string; avatar_url: string | null; active: boolean; };
type DMConvo = { id: string; a_id: string; b_id: string; updated_at: string; last_message: string | null; other_id: string; other_name: string; other_avatar: string | null; };
type DMMessage = { id: string; conversation_id: string; sender_id: string; content: string; read: boolean; created_at: string };

function nameOf(s: StaffRow) {
  const n = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
  return n || s.email;
}
function initials(n: string) {
  return (n || "U").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
}

export default function StaffDM() {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);

  const [directory, setDirectory] = useState<StaffRow[]>([]);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      directory.filter(
        (s) =>
          s.active &&
          s.user_id !== me?.id &&
          (nameOf(s).toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase())),
      ),
    [directory, q, me?.id],
  );

  const [convos, setConvos] = useState<DMConvo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<DMMessage[]>([]);
  const [compose, setCompose] = useState("");
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const listRef = useRef<HTMLDivElement>(null);

  // bootstrap auth + me
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;
      const id = data.user.id;
      const staff = await supabase.from("staff").select("first_name,last_name,email,avatar_url,active").eq("user_id", id).maybeSingle();
      const name = staff.data ? `${staff.data.first_name ?? ""} ${staff.data.last_name ?? ""}`.trim() || data.user.email! : data.user.email!;
      setMe({ id, name });
    })();
  }, []);

  // load directory + my conversations + unread map
  useEffect(() => {
    if (!me?.id) return;
    (async () => {
      const dir = await supabase.from("staff").select("user_id,first_name,last_name,email,avatar_url,active").eq("active", true);
      if (!dir.error) setDirectory(dir.data as StaffRow[]);

      await refreshConvos(me.id);
      await refreshUnread(me.id);
    })();
  }, [me?.id]);

  async function refreshConvos(myId: string) {
    const r = await supabase
      .from("staff_dm_conversations")
      .select("id,a_id,b_id,last_message,updated_at, a:staff!staff_dm_conversations_a_fkey(user_id,first_name,last_name,email,avatar_url), b:staff!staff_dm_conversations_b_fkey(user_id,first_name,last_name,email,avatar_url)")
      .or(`a_id.eq.${myId},b_id.eq.${myId}`)
      .order("updated_at", { ascending: false });

    if (r.error) return;
    const rows = (r.data as any[]).map((c) => {
      const other = c.a_id === myId ? c.b : c.a;
      const other_id = other.user_id;
      const other_name = `${other.first_name ?? ""} ${other.last_name ?? ""}`.trim() || other.email;
      return {
        id: c.id,
        a_id: c.a_id,
        b_id: c.b_id,
        updated_at: c.updated_at,
        last_message: c.last_message,
        other_id,
        other_name,
        other_avatar: other.avatar_url,
      } as DMConvo;
    });
    setConvos(rows);
  }

  async function refreshUnread(myId: string) {
    const u = await supabase.from("v_staff_dm_unread").select("conversation_id, unread_count").eq("recipient_id", myId);
    if (u.error) return;
    const m: Record<string, number> = {};
    (u.data as any[]).forEach((r) => (m[r.conversation_id] = Number(r.unread_count) || 0));
    setUnreadMap(m);
  }

  async function ensureConvoWith(otherId: string) {
    if (!me?.id) return null;
    // Try to find existing
    const f = await supabase
      .from("staff_dm_conversations")
      .select("id")
      .or(`and(a_id.eq.${me.id},b_id.eq.${otherId}),and(a_id.eq.${otherId},b_id.eq.${me.id})`)
      .maybeSingle();
    if (!f.error && f.data) return f.data;

    // Create
    const ins = await supabase.from("staff_dm_conversations").insert({ a_id: me.id, b_id: otherId }).select("id").single();
    if (ins.error) {
      alert(ins.error.message);
      return null;
    }
    return ins.data;
  }

  async function loadMessages(conversationId: string) {
    const r = await supabase
      .from("staff_dm_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (!r.error) setMsgs(r.data as DMMessage[]);

    // mark read for my side
    await supabase
      .from("staff_dm_messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", me!.id)
      .eq("read", false);

    setUnreadMap((m) => ({ ...m, [conversationId]: 0 }));

    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }),
    );
  }

  async function send() {
    if (!selectedId || !me?.id || !compose.trim()) return;
    const content = compose.trim();
    setCompose("");

    const optimistic: DMMessage = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: selectedId,
      sender_id: me.id,
      content,
      read: true,
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, optimistic]);

    const ins = await supabase.from("staff_dm_messages").insert({
      conversation_id: selectedId,
      sender_id: me.id,
      content,
      read: true,
    });
    if (ins.error) alert(ins.error.message);

    await supabase.from("staff_dm_conversations").update({ last_message: content, updated_at: new Date().toISOString() }).eq("id", selectedId);
  }

  // realtime for my convos & msgs
  useEffect(() => {
    if (!me?.id) return;

    const convCh = supabase
      .channel(`staffdm_convos_${me.id}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "staff_dm_conversations", event: "*", filter: `a_id=eq.${me.id}` },
        async () => {
          await refreshConvos(me.id);
          await refreshUnread(me.id);
        },
      )
      .on(
        "postgres_changes",
        { schema: "public", table: "staff_dm_conversations", event: "*", filter: `b_id=eq.${me.id}` },
        async () => {
          await refreshConvos(me.id);
          await refreshUnread(me.id);
        },
      )
      .subscribe();

    // global new messages: bump unread for conversations I’m not viewing
    const msgCh = supabase
      .channel(`staffdm_msgs_${me.id}`)
      .on("postgres_changes", { schema: "public", table: "staff_dm_messages", event: "INSERT" }, (payload) => {
        const m = payload.new as DMMessage;
        // Is this my conversation?
        if (!convos.some((c) => c.id === m.conversation_id)) return;
        // If I didn't send it and it's not open, increase badge
        if (m.sender_id !== me.id && selectedId !== m.conversation_id) {
          setUnreadMap((u) => ({ ...u, [m.conversation_id]: (u[m.conversation_id] ?? 0) + 1 }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(convCh);
      supabase.removeChannel(msgCh);
    };
  }, [me?.id, convos, selectedId]);

  // subscribe on selected conversation for fine-grained updates
  useEffect(() => {
    if (!selectedId) return;

    const ch = supabase
      .channel(`staffdm_thread_${selectedId}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "staff_dm_messages", event: "*", filter: `conversation_id=eq.${selectedId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            setMsgs((m) => [...m, payload.new as DMMessage]);
            // mark read if message from other
            const n = payload.new as DMMessage;
            if (n.sender_id !== me?.id) {
              await supabase.from("staff_dm_messages").update({ read: true }).eq("id", n.id);
              setUnreadMap((u) => ({ ...u, [selectedId]: 0 }));
            }
          } else {
            // refresh safely
            await loadMessages(selectedId);
          }
          requestAnimationFrame(() =>
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedId]); // eslint-disable-line

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Directory + New DM */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Staff Directory</span>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search staff…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((s) => {
              const n = nameOf(s);
              return (
                <button
                  key={s.user_id}
                  onClick={async () => {
                    const c = await ensureConvoWith(s.user_id);
                    if (!c) return;
                    await refreshConvos(me!.id);
                    await refreshUnread(me!.id);
                    setSelectedId(c.id);
                    await loadMessages(c.id);
                  }}
                  className="w-full p-4 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  <Avatar><AvatarImage src={s.avatar_url ?? undefined} /><AvatarFallback>{initials(n)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{n}</div>
                    <div className="text-xs text-gray-500 truncate">{s.email}</div>
                  </div>
                  <Plus className="ml-auto h-4 w-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversations */}
      <Card className="md:col-span-1">
        <CardHeader><CardTitle>Conversations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {convos.map((c) => {
              const un = unreadMap[c.id] ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={async () => {
                    setSelectedId(c.id);
                    await loadMessages(c.id);
                  }}
                  className={`w-full p-4 text-left hover:bg-gray-50 flex items-center gap-3 border-l-4 ${
                    selectedId === c.id ? "bg-cyan-50 border-cyan-500" : "border-transparent"
                  }`}
                >
                  <Avatar><AvatarImage src={c.other_avatar ?? undefined} /><AvatarFallback>{initials(c.other_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="truncate font-medium">{c.other_name}</div>
                      <span className="text-xs text-gray-500">
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{c.last_message ?? "—"}</div>
                  </div>
                  {!!un && <Badge>{un}</Badge>}
                </button>
              );
            })}
            {convos.length === 0 && <div className="p-6 text-sm text-gray-500">No conversations yet. Start one from the directory.</div>}
          </div>
        </CardContent>
      </Card>

      {/* Thread */}
      <Card className="md:col-span-1 flex flex-col">
        <CardHeader><CardTitle>Thread</CardTitle></CardHeader>
        <CardContent className="flex-1 p-0">
          <div ref={listRef} className="h-[380px] overflow-y-auto p-4">
            <div className="space-y-3">
              {msgs.map((m) => {
                const own = m.sender_id === me?.id;
                return (
                  <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${own ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-900"}`}>
                      <div className="opacity-60 text-[10px] mb-1">{own ? "You" : ""}</div>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div className="opacity-60 text-[10px] mt-1">{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
              {msgs.length === 0 && <div className="text-sm text-gray-500">Select or start a conversation.</div>}
            </div>
          </div>
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message…"
                value={compose}
                onChange={(e) => setCompose(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button onClick={send} disabled={!compose.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
