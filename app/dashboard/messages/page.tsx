"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, Search, Phone, Video, MoreVertical } from "lucide-react";

type Conversation = {
  id: string;
  patient_id: string;
  other_id: string;
  other_name: string;
  other_role: "doctor" | "nurse" | "counselor";
  other_avatar: string | null;
  title: string | null;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  patient_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | "doctor" | "nurse" | "counselor";
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
};

export default function MessagesPage() {
  const { isAuthenticated, loading, user, patient } = useAuth();
  const patientId = isAuthenticated ? (patient?.user_id || patient?.id || user?.id) : null;

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [q, setQ] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations for current user
  const loadConversations = useCallback(async () => {
    if (!patientId) return;
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`patient_id.eq.${patientId},other_id.eq.${patientId}`) // patient or provider view
      .order("updated_at", { ascending: false });
    if (!error) setConvs((data as Conversation[]) || []);
  }, [patientId]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (!error) setMsgs((data as MessageRow[]) || []);
    // scroll bottom
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
  }, []);

  // Realtime: conversations (for list refresh) + messages for selected conversation
  useEffect(() => {
    if (!patientId) return;
    void loadConversations();

    const convCh = supabase
      .channel(`conv_${patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `patient_id=eq.${patientId}` }, loadConversations)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `other_id=eq.${patientId}` }, loadConversations)
      .subscribe();

    return () => { convCh.unsubscribe(); };
  }, [patientId, loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    void loadMessages(selectedId);

    const msgCh = supabase
      .channel(`msgs_${selectedId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        // minimal reconciliation
        if (payload.eventType === "INSERT") setMsgs((m) => [...m, payload.new as MessageRow]);
        else void loadMessages(selectedId);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
      })
      .subscribe();

    return () => { msgCh.unsubscribe(); };
  }, [selectedId, loadMessages]);

  // Create a conversation if needed (patient → provider)
  async function ensureConversation(otherId: string, otherName: string, otherRole: Conversation["other_role"]) {
    if (!patientId) return null;
    // try find
    const { data: found } = await supabase
      .from("conversations")
      .select("*")
      .eq("patient_id", patientId)
      .eq("other_id", otherId)
      .maybeSingle();
    if (found) return found as Conversation;

    const { data, error } = await supabase
      .from("conversations")
      .insert([{ patient_id: patientId, other_id: otherId, other_name: otherName, other_role: otherRole, title: otherName }])
      .select("*")
      .single();
    if (error) { alert(error.message); return null; }
    return data as Conversation;
  }

  async function handleSend() {
    if (!selectedId || !patientId || !newMessage.trim()) return;

    // Who is the current user in this chat?
    const amPatient = patientId === user?.id;
    const sender_id = user?.id || patientId!;
    const sender_role: MessageRow["sender_role"] = amPatient ? "patient" : "doctor"; // adjust if you have staff roles in auth
    const sender_name = user?.user_metadata?.name || user?.email || "You";

    // optimistic
    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: selectedId,
      patient_id: patientId!,
      sender_id,
      sender_name,
      sender_role,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      read: false,
      urgent: false,
    };
    setMsgs((m) => [...m, optimistic]);
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      patient_id: patientId,
      sender_id,
      sender_name,
      sender_role,
      content: optimistic.content,
      read: false,
      urgent: false,
    });
    if (error) alert(error.message);
    // bump conversation updated_at
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedId);
  }

  // Filter conversations client-side
  const filteredConvs = useMemo(
    () =>
      convs.filter(
        (c) =>
          !q ||
          c.other_name.toLowerCase().includes(q.toLowerCase()) ||
          (c.title || "").toLowerCase().includes(q.toLowerCase())
      ),
    [convs, q]
  );

  if (loading || !isAuthenticated) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-2">Communicate with your healthcare team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search conversations..." className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {filteredConvs.map((c) => {
                const initials = c.other_name.split(" ").map((n) => n[0]).join("");
                const active = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 border-l-4 ${active ? "border-cyan-500 bg-cyan-50" : "border-transparent"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={c.other_avatar || "/placeholder.svg"} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">{c.other_name}</p>
                          <span className="text-xs text-gray-500">
                            {new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 capitalize">{c.other_role}</p>
                      </div>
                      {/* unread badge can be computed with a view; omitted for brevity */}
                    </div>
                  </div>
                );
              })}
              {filteredConvs.length === 0 && <div className="p-6 text-sm text-gray-500">No conversations yet.</div>}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedId ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={convs.find((c) => c.id === selectedId)?.other_avatar || "/placeholder.svg"}
                      />
                      <AvatarFallback>
                        {convs.find((c) => c.id === selectedId)?.other_name
                          ?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{convs.find((c) => c.id === selectedId)?.other_name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{convs.find((c) => c.id === selectedId)?.other_role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm"><Phone className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm"><Video className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {msgs.map((m) => {
                    const isOwn = m.sender_id === (user?.id || "");
                    return (
                      <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-900"}`}>
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? "text-cyan-100" : "text-gray-500"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {msgs.length === 0 && <div className="text-sm text-gray-500">No messages yet. Say hi 👋</div>}
                </div>
              </CardContent>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 min-h-[40px] max-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} className="self-end"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a healthcare provider to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
