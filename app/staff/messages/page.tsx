"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { supabase, ensureSession, logout } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProviderRole = "doctor" | "nurse" | "counselor";
type ConversationRow = {
  id: string; patient_id: string; provider_id: string;
  last_message: string | null; last_message_at: string | null; created_at: string;
  patients?: { full_name?: string | null; email?: string | null; avatar?: string | null } | null;
};
type Conversation = { id: string; patient_id: string; name: string; updated_at: string; last_message: string | null; };
type MessageRow = {
  id: string; conversation_id: string; patient_id: string;
  sender_id: string; sender_name: string; sender_role: "patient" | ProviderRole;
  content: string; created_at: string; read: boolean; urgent: boolean;
};

export default function StaffMessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // me
  const [meId, setMeId] = useState<string | null>(null);
  const [meName, setMeName] = useState("Me");
  const [meRole, setMeRole] = useState<ProviderRole>("nurse");

  // data
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});

  // compose
  const [compose, setCompose] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  function initials(s?: string | null) {
    const v = (s ?? "U").trim();
    return v.split(/\s+/).map(n => n[0]).join("").slice(0, 2).toUpperCase();
  }

  // --- fetchers ---
  async function fetchConversations(uid: string) {
    const q = await supabase.from("conversations").select(
      "id, patient_id, last_message, last_message_at, created_at, patients:patient_id(full_name, email)"
    ).eq("provider_id", uid).order("created_at", { ascending: false });
    if (q.error) { setConvs([]); return; }
    const mapped: Conversation[] = ((q.data as ConversationRow[]) ?? []).map(r => ({
      id: r.id,
      patient_id: r.patient_id,
      name: r.patients?.full_name ?? r.patients?.email ?? "Patient",
      last_message: r.last_message ?? null,
      updated_at: (r.last_message_at ?? r.created_at) as string,
    })).sort((a,b)=>a.updated_at<b.updated_at?1:-1);
    setConvs(mapped);
  }
  async function fetchUnread(uid: string) {
    const r = await supabase.from("v_staff_dm_unread").select("conversation_id, unread_from_patient").eq("provider_id", uid);
    if (r.error) return;
    const m: Record<string, number> = {};
    for (const row of (r.data as any[]) ?? []) m[row.conversation_id] = Number(row.unread_from_patient) || 0;
    setUnread(m);
  }
  async function markRead(conversationId: string) {
    await supabase.from("messages").update({ read: true })
      .eq("conversation_id", conversationId).eq("read", false).eq("sender_role", "patient");
    setUnread((u)=>({ ...u, [conversationId]: 0 }));
  }

  // --- bootstrap ---
  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await ensureSession({ graceMs: 200, fallbackMs: 1200 });
      if (!session) { setLoading(false); router.replace("/staff/login?redirect=/staff/messages"); return; }
      const uid = session.user.id;
      setMeId(uid);
      const u = (await supabase.auth.getUser()).data.user;
      if (u) setMeName((u.user_metadata?.full_name as string) || u.email || "Me");

      // get role (fallback nurse)
      const s = await supabase.from("staff").select("role").eq("user_id", uid).maybeSingle();
      const r = (s.error ? null : (s.data?.role as string | null))?.toLowerCase() ?? "nurse";
      setMeRole(r.includes("doc") ? "doctor" : r.includes("counsel") ? "counselor" : "nurse");

      await Promise.allSettled([fetchConversations(uid), fetchUnread(uid)]);
      setLoading(false);

      // deep-link without useSearchParams
      if (typeof window !== "undefined") {
        const id = new URLSearchParams(window.location.search).get("open");
        if (id) setSelectedId(id);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  // --- realtime: list + unread ---
  useEffect(() => {
    if (!meId) return;

    const convCh = supabase
      .channel(`conv_${meId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `provider_id=eq.${meId}` },
        async () => { await fetchConversations(meId); await fetchUnread(meId); })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `provider_id=eq.${meId}` },
        async () => { await fetchConversations(meId); await fetchUnread(meId); })
      .subscribe();

    const inboxCh = supabase
      .channel(`inbox_${meId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as MessageRow;
          if (m.sender_role !== 'patient') return;
          if (selectedId === m.conversation_id) return;
          setUnread(prev => ({ ...prev, [m.conversation_id]: (prev[m.conversation_id] ?? 0) + 1 }));
        })
      .subscribe();

    return () => {
      supabase.removeChannel(convCh);
      supabase.removeChannel(inboxCh);
    };
  }, [meId, selectedId]);

  // --- open thread ---
  useEffect(() => {
    if (!selectedId) return;
    let alive = true;

    (async () => {
      const res = await supabase.from("messages").select("*")
        .eq("conversation_id", selectedId).order("created_at",{ascending:true});
      if (!res.error && alive) setMsgs((res.data as MessageRow[]) ?? []);
      await markRead(selectedId);
      requestAnimationFrame(()=>listRef.current?.scrollTo({top:listRef.current.scrollHeight, behavior:"smooth"}));
    })();

    const thread = supabase
      .channel(`thread_${selectedId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` },
        async (payload) => {
          const m = payload.new as MessageRow;
          setMsgs(cur => [...cur, m]);
          if (m.sender_role === "patient") await markRead(selectedId);
          requestAnimationFrame(()=>listRef.current?.scrollTo({top:listRef.current.scrollHeight, behavior:"smooth"}));
        })
      .subscribe();

    return () => { alive = false; supabase.removeChannel(thread); };
  }, [selectedId]);

  // --- send ---
  async function send() {
    if (!selectedId || !meId || !compose.trim()) return;
    const c = convs.find(x => x.id === selectedId); if (!c) return;
    const content = compose.trim(); setCompose("");

    const optimistic: MessageRow = {
      id:`tmp-${crypto.randomUUID()}`, conversation_id:selectedId, patient_id:c.patient_id,
      sender_id:meId, sender_name:meName, sender_role:meRole, content, created_at:new Date().toISOString(),
      read: true, urgent:false
    };
    setMsgs(m=>[...m, optimistic]);

    const ins = await supabase.from("messages").insert({
      conversation_id:selectedId, patient_id:c.patient_id,
      sender_id:meId, sender_name:meName, sender_role:meRole,
      content, read:true, urgent:false
    });
    if (ins.error) { setMsgs(m=>m.filter(x=>x.id!==optimistic.id)); alert(ins.error.message); return; }

    await supabase.from("conversations").update({ last_message: content, last_message_at: new Date().toISOString() })
      .eq("id", selectedId);
  }

  // --- tiny realtime debugger ---
  function RealtimeDebug() {
    const [state, setState] = useState("idle");
    useEffect(() => {
      const ch = supabase
        .channel("dbg_msgs")
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
          console.log("[DEBUG] messages INSERT:", p.new);
          setState("events");
        })
        .subscribe((s) => { if (s === "SUBSCRIBED") setTimeout(()=>setState(cur=>cur==="idle"?"no-events":cur), 4000); });
      return () => { supabase.removeChannel(ch); };
    }, []);
    return <div className="text-[11px] text-slate-500">Realtime: {state}</div>;
  }

  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Direct Messages (LIVE)</h1>
        <div className="flex items-center gap-2">
          <RealtimeDebug />
          <Button variant="outline" size="sm" onClick={async ()=>{ await logout(); router.refresh(); }}>Logout</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* conversations */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle>Chats</CardTitle></CardHeader>
          <CardContent className="p-0">
            {convs.map(c=>{
              const active = selectedId===c.id; const u = unread[c.id] ?? 0;
              return (
                <button key={c.id} onClick={()=>setSelectedId(c.id)}
                  className={`w-full p-4 text-left flex items-center justify-between border-l-4 ${active?"border-cyan-500 bg-cyan-50":"border-transparent hover:bg-gray-50"}`}>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-gray-500 truncate">{c.last_message ?? "—"}</div>
                  </div>
                  {u>0 && <Badge>{u}</Badge>}
                </button>
              );
            })}
            {convs.length===0 && <div className="p-6 text-sm text-gray-500">No conversations.</div>}
          </CardContent>
        </Card>

        {/* thread */}
        <Card className="md:col-span-2 flex flex-col">
          {!selectedId ? (
            <CardContent className="flex-1 grid place-items-center text-sm text-gray-500">Select a conversation</CardContent>
          ) : (
            <>
              <CardContent ref={listRef} className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {msgs.map(m=>{
                    const own = m.sender_id===meId;
                    return (
                      <div key={m.id} className={`flex ${own?"justify-end":"justify-start"}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${own?"bg-cyan-500 text-white":"bg-gray-100 text-gray-900"}`}>
                          <div className="text-[10px] opacity-60 mb-1">{own?meName:"Patient"}</div>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                          <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Textarea value={compose} onChange={e=>setCompose(e.target.value)}
                    placeholder="Type a message…" className="min-h-[40px] max-h-[120px] flex-1"
                    onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); void send(); }}}/>
                  <Button onClick={send} disabled={!compose.trim()}><Send className="h-4 w-4"/></Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
