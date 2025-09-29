"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, Video, ArrowLeft, User } from "lucide-react";

/* same FIGMA + swal as above */
const FIGMA2 = { primary:"#2AD1C8", primary700:"#16B5AC", gray500:"#64748B", gray400:"#94A3B8" };
async function toastOk(t: string){ const Swal=(await import("sweetalert2")).default; const Toast=Swal.mixin({toast:true,position:"top-end",timer:1600,showConfirmButton:false,customClass:{popup:"rounded-xl"}}); return Toast.fire({title:`💙 ${t}`}); }

type Patient = { user_id:string; full_name:string|null; first_name:string|null; last_name:string|null; email:string|null; phone_number:string|null; };
type Appt = { id:string; appointment_time:string; status:"scheduled"|"confirmed"|"pending"|"cancelled"|"completed"; title:string|null; provider:string|null; duration_min:number|null; type:string|null; location:string|null; is_virtual:boolean; notes:string|null; };

const fmtDate=(iso:string)=>new Date(iso).toLocaleDateString("en-US",{weekday:"long", year:"numeric", month:"long", day:"numeric"});
const fmtTime=(iso:string)=>new Date(iso).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const endTime=(a:Appt)=>new Date(new Date(a.appointment_time).getTime()+((a.duration_min??60)*60000));

export default function StaffPatientDetailPage(){
  const { id } = useParams<{id: string}>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient|null>(null);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const chRef = useRef<ReturnType<typeof supabase.channel>|null>(null);

  useEffect(()=>{ void load(); /* eslint-disable-next-line */ }, [id]);

  async function load(){
    if(!id) return;
    setLoading(true);
    try{
      const { data: p, error: pe } = await supabase.from("patients").select("user_id,full_name,first_name,last_name,email,phone_number").eq("user_id", id).maybeSingle();
      if(pe) throw pe;
      setPatient(p||null);

      const { data: a, error: ae } = await supabase
        .from("appointments")
        .select("id,appointment_time,status,title,provider,duration_min,type,location,is_virtual,notes")
        .eq("patient_id", id)
        .order("appointment_time", { ascending: true });
      if(ae) throw ae;
      setAppts(a||[]);
    } finally { setLoading(false); }
  }

  useEffect(()=>{
    if(!id) return;
    if(chRef.current){ void chRef.current.unsubscribe(); chRef.current=null; }
    const ch = supabase
      .channel(`patient_${id}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"patients", filter:`user_id=eq.${id}` }, ()=>{ void load(); })
      .on("postgres_changes", { event:"*", schema:"public", table:"appointments", filter:`patient_id=eq.${id}` }, ()=>{ void load(); })
      .subscribe();
    chRef.current = ch;
    return ()=>{ if(chRef.current) void chRef.current.unsubscribe(); };
  }, [id]);

  const now = new Date();
  const upcoming = useMemo(()=> appts.filter(a => new Date(a.appointment_time) >= now && a.status!=="cancelled"), [appts, now]);
  const history = useMemo(()=> appts.filter(a => new Date(a.appointment_time) < now || a.status==="completed" || a.status==="cancelled"), [appts, now]);

  function Name({p}:{p:Patient|null}){ const n = p ? (`${p.first_name??""} ${p.last_name??""}`.trim() || p.full_name || "Unknown") : ""; return <span>{n}</span>; }

  async function cancelAppt(id:string){
    const { error } = await supabase.from("appointments").update({ status:"cancelled" }).eq("id", id);
    if(error) return;
    await toastOk("Appointment cancelled");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" onClick={()=>router.back()}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-cyan-100 grid place-items-center"><User className="h-5 w-5 text-cyan-700" /></div>
          <div>
            <div className="text-xl font-semibold"><Name p={patient} /></div>
            <div className="text-sm text-slate-500">{patient?.email ?? "—"} • {patient?.phone_number ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <h2 className="text-sm font-semibold text-slate-700 mb-2">Upcoming</h2>
      <div className="space-y-3 mb-6">
        {upcoming.map(a=>{
          return (
            <Card key={a.id} className="hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-slate-900 font-medium">{a.title || "Appointment"}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700"> {a.type || "other"} </span>
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700">{a.status}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(a.appointment_time)}</div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{fmtTime(a.appointment_time)} – {fmtTime(endTime(a).toISOString())}</div>
                      <div className="flex items-center gap-2">{a.is_virtual ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}{a.location || (a.is_virtual ? "Virtual" : "—")}</div>
                      <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />Provider: {a.provider || "—"}</div>
                    </div>
                    {a.notes && <div className="mt-2 text-sm text-slate-700">{a.notes}</div>}
                  </div>
                  <div className="ml-4 flex gap-2">
                    {a.is_virtual && <Button size="sm" onClick={()=>toastOk("Open meeting link")}>Join</Button>}
                    <Button size="sm" variant="outline" onClick={()=>cancelAppt(a.id)}>Cancel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!loading && upcoming.length===0) && <div className="text-sm text-slate-500">No upcoming appointments.</div>}
      </div>

      {/* History */}
      <h2 className="text-sm font-semibold text-slate-700 mb-2">History</h2>
      <div className="space-y-3">
        {history.map(a=>{
          return (
            <Card key={a.id} className="opacity-95">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-slate-900 font-medium">{a.title || "Appointment"}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700">{a.type || "other"}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700">{a.status}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(a.appointment_time)}</div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{fmtTime(a.appointment_time)} – {fmtTime(endTime(a).toISOString())}</div>
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{a.location || (a.is_virtual ? "Virtual" : "—")}</div>
                      <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />Provider: {a.provider || "—"}</div>
                    </div>
                    {a.notes && <div className="mt-2 text-sm text-slate-700">{a.notes}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!loading && history.length===0) && <div className="text-sm text-slate-500">No history yet.</div>}
      </div>
    </div>
  );
}
