"use client";

import React, { useMemo, useState } from "react";

export type PatientItem = {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
  clinician?: string | null;
  payer?: string | null;
  time?: string;
};

type Props = {
  items?: PatientItem[];
  onNewGroup?: () => void;
};

const Icons = {
  filter:  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 5h18M7 12h10M10 19h4"/></svg>,
  search:  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2"/><path d="M21 21l-4.3-4.3" strokeWidth="2"/></svg>,
  phone:   <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M2 5a3 3 0 0 1 3-3h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a3 3 0 0 1-3 3h-1C9.82 20.5 3.5 14.18 2 7V5z"/></svg>,
  person:  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4" strokeWidth="2"/></svg>,
  medical: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  home:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 10.5 12 3l9 7.5V21H6v-6H9v6H4z"/></svg>,
  thumbsUp: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>,
};

const Seed: PatientItem[] = [
  { id:"p1", name:"Antonietta Keating", role:"SN PT HHA", phone:"(909)866-52233", clinician:"Dr. Maria Gonzalez", payer:"Medicare NGS", time:"Today · 04:37 AM" },
  { id:"p2", name:"Brenda Sue Hinkle", role:"SN PT", phone:"N/A", clinician:"Dr. Joshua Lawrence", payer:"Molina Medicaid", time:"Today · 04:37 AM" },
  { id:"p3", name:"Lamar Chaney", role:"SN PT MSW", phone:"(882)973-9922", clinician:null, payer:null, time:"Today · 04:37 AM" },
  { id:"p4", name:"Robert Mccloud", role:"SN PT HHA", time:"Today · 04:37 AM" },
  { id:"p5", name:"Emma McElroy", role:"SN PT HHA", time:"Today · 04:37 AM" },
];

export default function PatientInbox({ items = Seed, onNewGroup }: Props) {
  const [mode, setMode] = useState<"detailed" | "summary">("detailed");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.role.toLowerCase().includes(s) ||
        (p.clinician ?? "").toLowerCase().includes(s) ||
        (p.payer ?? "").toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan-300 transition-colors"
          />
        </div>
        <button className="h-12 w-12 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50 transition-colors">
          {Icons.filter}
        </button>
      </div>

      {/* Header row + segmented toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Patient <span className="font-bold text-slate-900">({items.length})</span>
        </div>
        <button className="text-sm text-cyan-600 hover:text-cyan-700 font-medium hover:underline transition-colors" onClick={onNewGroup}>
          New Patient Group
        </button>
      </div>

      {/* View toggle */}
      <div className="bg-slate-100 rounded-full p-1 w-full max-w-sm flex">
        <button
          onClick={() => setMode("detailed")}
          className={`flex-1 h-10 rounded-full text-sm font-medium transition-all duration-200 ${
            mode === "detailed" 
              ? "bg-cyan-500 text-white shadow-md" 
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          Detailed
        </button>
        <button
          onClick={() => setMode("summary")}
          className={`flex-1 h-10 rounded-full text-sm font-medium transition-all duration-200 ${
            mode === "summary" 
              ? "bg-cyan-500 text-white shadow-md" 
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          Summary
        </button>
      </div>

      {/* Lists */}
      {mode === "detailed" ? (
        <ul className="space-y-4">
          {filtered.map((p, idx) => (
            <li key={p.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              {/* Colored indicator bar */}
              <div className={`absolute right-2 top-2 h-[90%] w-1 rounded-full ${idx % 2 ? "bg-cyan-400" : "bg-slate-300"}`} />
              
              <div className="flex items-start gap-4">
                {/* Patient icon */}
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 grid place-items-center shrink-0 shadow-sm">
                  {Icons.home}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Header with name, role, and time */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-base leading-tight">{p.name}</div>
                      <div className="text-sm text-cyan-600 font-medium mt-0.5">{p.role}</div>
                    </div>
                    <div className="text-xs text-slate-500 font-medium whitespace-nowrap">{p.time ?? "Today · 04:37 AM"}</div>
                  </div>
                  
                  {/* Patient details with proper icons */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <div className="text-cyan-600 flex-shrink-0">{Icons.phone}</div>
                      <span className="font-medium">{p.phone ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <div className="text-cyan-600 flex-shrink-0">{Icons.person}</div>
                      <span className="font-medium">{p.clinician ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <div className="text-cyan-600 flex-shrink-0">{Icons.medical}</div>
                      <span className="font-medium">{p.payer ?? "N/A"}</span>
                    </div>
                  </div>
                </div>
                
                {/* Optional interaction indicator */}
                {idx === 1 && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-8 w-8 rounded-full bg-cyan-500 text-white grid place-items-center shadow-sm">
                      {Icons.thumbsUp}
                    </div>
                    <span className="text-xs font-bold text-cyan-600">33</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {filtered.map((p, idx) => (
            <li key={p.id} className="relative px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              {/* Colored indicator line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${idx % 2 ? "bg-cyan-400" : "bg-slate-300"}`} />
              
              <div className="flex items-center gap-4 ml-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 grid place-items-center shadow-sm">
                  {Icons.home}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                  <div className="text-xs text-cyan-600 font-medium mt-0.5">{p.role}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium whitespace-nowrap">{p.time ?? "Today · 04:37 AM"}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
