"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type PatientRT = {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string | null;
};

export type AppointmentRT = {
  id: string;
  patient_id: string;
  appointment_time: string;
  status: "scheduled" | "confirmed" | "pending" | "cancelled" | "completed";
  title: string | null;
  provider: string | null;
  duration_min: number | null;
  type: string | null;
  location: string | null;
  is_virtual: boolean;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type State = {
  loading: boolean;
  userId: string | null;
  patient: PatientRT | null;
  appointments: AppointmentRT[];
  error?: string;
};

export function useCurrentPatientRealtime() {
  const [state, setState] = useState<State>({ loading: true, userId: null, patient: null, appointments: [] });
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setState((s) => ({ ...s, loading: true, error: undefined }));

      // Resolve auth user
      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr) { if (!cancelled) setState((s)=>({ ...s, loading:false, error:uErr.message })); return; }
      const uid = user?.id ?? null;
      if (!uid) { if (!cancelled) setState({ loading:false, userId:null, patient:null, appointments:[] }); return; }

      // Initial data (patient + appointments)
      const [{ data: patient }, { data: appts }] = await Promise.all([
        supabase.from("patients")
          .select("user_id, full_name, first_name, last_name, email, phone_number, created_at")
          .eq("user_id", uid).maybeSingle(),
        supabase.from("appointments")
          .select("id, patient_id, appointment_time, status, title, provider, duration_min, type, location, is_virtual, notes, created_at, updated_at")
          .eq("patient_id", uid).order("appointment_time", { ascending: true }),
      ]);

      if (!cancelled) setState({ loading:false, userId: uid, patient: patient ?? null, appointments: appts ?? [] });

      // Subscribe realtime
      if (chanRef.current) { await chanRef.current.unsubscribe(); chanRef.current = null; }
      const channel = supabase
        .channel(`patient_live_${uid}`)
        .on("postgres_changes", { event:"*", schema:"public", table:"patients", filter:`user_id=eq.${uid}` }, (payload) => {
          setState((s)=>({ ...s, patient: payload.eventType==="DELETE" ? null : ((payload.new as PatientRT) ?? s.patient) }));
        })
        .on("postgres_changes", { event:"*", schema:"public", table:"appointments", filter:`patient_id=eq.${uid}` }, (payload) => {
          setState((s) => {
            const list = [...s.appointments];
            if (payload.eventType === "INSERT") {
              list.push(payload.new as AppointmentRT);
              list.sort((a,b)=>+new Date(a.appointment_time)-+new Date(b.appointment_time));
            } else if (payload.eventType === "UPDATE") {
              const i = list.findIndex(x => x.id === (payload.new as any).id);
              if (i >= 0) list[i] = payload.new as AppointmentRT;
            } else if (payload.eventType === "DELETE") {
              const id = (payload.old as any).id;
              const i = list.findIndex(x => x.id === id);
              if (i >= 0) list.splice(i,1);
            }
            return { ...s, appointments: list };
          });
        })
        .subscribe();
      chanRef.current = channel;
    }

    void bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(() => { void bootstrap(); });
    return () => {
      listener.subscription.unsubscribe();
      if (chanRef.current) { chanRef.current.unsubscribe(); chanRef.current = null; }
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const upcoming = useMemo(() => state.appointments.filter(a => new Date(a.appointment_time) >= now && a.status !== "cancelled"), [state.appointments, now]);
  const nextAppointment = upcoming.length ? upcoming[0] : null;

  return { ...state, nextAppointment, upcoming };
}
