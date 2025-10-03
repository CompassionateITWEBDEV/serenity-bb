"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, Send } from "lucide-react";
import Swal from "sweetalert2";

type ProviderRole = "doctor"|"nurse"|"counselor";
type Conversation = {
  id:string; patient_id:string; provider_id:string;
  provider_name:string; provider_role:ProviderRole; provider_avatar:string|null;
  last_message:string|null; last_message_at:string|null; created_at:string;
  patient: { user_id:string; full_name:string|null; email:string|null; avatar:string|null } | null;
};
type MessageRow = { id:string; conversation_id:string; patient_id:string; sender_id:string; sender_name:string; sender_role:"patient"|ProviderRole; content:string; created_at:string; read:boolean; urgent:boolean; };

function initials(name?:string|null){const s=(name??"").trim(); if(!s)return "U"; return s.split(/\s+/).map(n=>n[0]).join("").slice(0,2).toUpperCase();}
function toProviderRole(role?:string|null):ProviderRole{const r=(role??"").toLowerCase(); if(r.includes("doc"))return"doctor"; if(r.includes("nurse"))return"nurse"; if(r.includes("counsel"))return"counselor"; return"nurse";}

export default function StaffMessagesPage(){
  const [me,setMe]=useState<{id:string; role:ProviderRole; name:string}|null>(null);
  const [convs,setConvs]=useState<Conversation[]>([]); const [selectedId,setSelectedId]=useState<string|null>(null);
  const [msgs,setMsgs]=useState<MessageRow[]>([]); const [q,setQ]=useState(""); const [compose,setCompose]=useState("");
  const listRef=useRef<HTMLDivElement>(null);

  // load me from auth + staff table
  useEffect(()=>{(async()=>{
    const { data: au } = await supabase.auth.getUser(); const uid=au.user?.id; if(!uid) return;
    const { data: s, error } = await supabase.from("staff").select("user_id, first_name, last_name, role").eq("user_id", uid).maybeSingle();
    if(error||!s){ await Swal.fire("Access error","Not a staff user","error"); return; }
    setMe({ id: uid, role: toProviderRole(s.role), name: [s.first_name,s.last_name].filter(Boolean).join(" ") || au.user?.email || "Me" });
  })();},[]);

  // load conversations where provider_id = me
  useEffect(()=>{ if(!me) return;(async()=>{
    const { data, error } = await supabase.from("conversations").select(`
      id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at,
      patient:patients!conversations_patient_id_fkey(user_id, full_name, email, avatar)
    `).eq("provider_id", me.id).order("last_message_at",{ascending:false, nullsFirst:false});
    if(error){ await Swal.fire("Error loading conversations", error.message, "error"); return; }
    setConvs((data as any)||[]);
  })();},[me]);

  // realtime conv list
  useEffect(()=>{ if(!me) return; const ch=supabase.channel(`staff_convs_${me.id}`)
    .on("postgres_changes",{schema:"public",table:"conversations",event:"*",filter:`provider_id=eq.${me.id}`},
      async()=>{ const {data}=await supabase.from("conversations").select(`
        id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at,
        patient:patients!conversations_patient_id_fkey(user_id, full_name, email, avatar)
      `).eq("provider_id",me.id).order("last_message_at",{ascending:false}); setConvs((data as any)||[]); })
    .subscribe(); return()=>{supabase.removeChannel(ch)}; },[me]);

  // load thread + realtime
  useEffect(()=>{ if(!selectedId||!me) return; let alive=true;(async()=>{
    const {data,error}=await supabase.from("messages").select("*").eq("conversation_id",selectedId).order("created_at",{ascending:true});
    if(error){ await Swal.fire("Error loading messages", error.message, "error"); return; }
    if(alive){ setMsgs((data as MessageRow[])||[]); requestAnimationFrame(()=>listRef.current?.scrollTo({top:listRef.current.scrollHeight}));}
  })();
  const ch=supabase.channel(`staff_thread_${selectedId}`).on("postgres_changes",
    {schema:"public",table:"messages",event:"*",filter:`conversation_id=eq.${selectedId}`},
    async(payload)=>{ if(payload.eventType==="INSERT"){ const m=payload.new as MessageRow; setMsgs(prev=>[...prev,m]); requestAnimationFrame(()=>listRef.current?.scrollTo({top:listRef.current.scrollHeight,behavior:"smooth"})); }
      else { const {data}=await supabase.from("messages").select("*").eq("conversation_id",selectedId).order("created_at",{ascending:true}); setMsgs((data as MessageRow[])||[]); } }
  ).subscribe(); return()=>{supabase.removeChannel(ch); alive=false}; },[selectedId,me]);

  async function send(){
    if(!me||!selectedId||!compose.trim())return;
    const convo=convs.find(c=>c.id===selectedId); if(!convo) return;
    const optimistic:MessageRow={ id:`tmp-${crypto.randomUUID()}`, conversation_id:selectedId, patient_id:convo.patient_id,
      sender_id:me.id, sender_name:me.name, sender_role:me.role, content:compose.trim(), created_at:new Date().toISOString(), read:false, urgent:false };
    setMsgs(m=>[...m,optimistic]); setCompose("");
    const { error } = await supabase.from("messages").insert({
      conversation_id:selectedId, patient_id:convo.patient_id, sender_id:me.id, sender_name:me.name, sender_role:me.role, content:optimistic.content, read:false, urgent:false
    });
    if(error){ setMsgs(m=>m.filter(x=>x.id!==optimistic.id)); await Swal.fire("Send failed", error.message, "error"); return; }
    await supabase.from("conversations").update({ last_message: optimistic.content, last_message_at: new Date().toISOString() }).eq("id", selectedId);
  }

  const filtered=useMemo(()=>{const v=q.trim().toLowerCase(); const base=convs.slice().sort((a,b)=>{const ta=a.last_message_at||a.created_at; const tb=b.last_message_at||b.created_at; return (tb??"").localeCompare(ta??"");}); if(!v)return base; return base.filter(c=>(c.patient?.full_name??c.patient?.email??"").toLowerCase().includes(v)||(c.last_message??"").toLowerCase().includes(v));},[convs,q]);

  return (<div className="container mx-auto p-6 max-w-7xl">
    <div className="mb-6"><h1 className="text-3xl font-bold text-gray-900">Messages</h1><p className="mt-2 text-gray-600">Chat with your patients</p></div>
    <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1"><CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5"/>Conversations</CardTitle>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4"/><Input placeholder="Search patients…" className="pl-10" value={q} onChange={e=>setQ(e.target.value)}/></div>
      </CardHeader>
      <CardContent className="p-0"><div className="divide-y">
        {filtered.map(c=>{const active=selectedId===c.id; const pname=c.patient?.full_name||c.patient?.email||"Patient";
          return (<button key={c.id} onClick={()=>setSelectedId(c.id)}
            className={`flex w-full items-center gap-3 border-l-4 p-4 text-left hover:bg-gray-50 ${active?"border-cyan-500 bg-cyan-50":"border-transparent"}`}>
            <Avatar><AvatarImage src={c.patient?.avatar??undefined}/><AvatarFallback>{initials(pname)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className="truncate font-medium text-gray-900">{pname}</p>
              <span className="text-xs text-gray-500">{new Date(c.last_message_at??c.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div>
              <div className="flex items-center gap-2"><Badge variant="secondary" className="capitalize">{c.provider_role}</Badge><p className="truncate text-xs text-gray-500">{c.last_message??"—"}</p></div>
            </div></button>);
        })}
        {filtered.length===0 && <div className="p-6 text-sm text-gray-500">No conversations yet.</div>}
      </div></CardContent></Card>

      <Card className="flex flex-col lg:col-span-2">
        {!selectedId ? (
          <CardContent className="flex flex-1 items-center justify-center">
            <div className="text-center"><MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-400"/><h3 className="mb-2 text-lg font-medium text-gray-900">Select a conversation</h3></div>
          </CardContent>
        ):(<>
          <CardContent ref={listRef} className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {msgs.map(m=>{const own=m.sender_id===me?.id; return (
                <div key={m.id} className={`flex ${own?"justify-end":"justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${own?"bg-cyan-500 text-white":"bg-gray-100 text-gray-900"}`}>
                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    <p className={`mt-1 text-xs ${own?"text-cyan-100":"text-gray-500"}`}>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</p>
                  </div>
                </div>
              )})}
              {msgs.length===0 && <div className="text-sm text-gray-500">No messages yet.</div>}
            </div>
          </CardContent>
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea placeholder="Type your message…" value={compose} onChange={e=>setCompose(e.target.value)}
                className="min-h-[40px] max-h-[120px] flex-1"
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); void send();}}}/>
              <Button onClick={send} disabled={!compose.trim()}><Send className="h-4 w-4"/></Button>
            </div>
          </div>
        </>)}
      </Card>
    </div>
  </div>);
}
