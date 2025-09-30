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
  dot:     <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />,
  home:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 10.5 12 3l9 7.5V21H6v-6H9v6H4z"/></svg>,
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
    <section className="rounded-2xl bg-white/95 border border-slate-100 shadow-sm p-4 space-y-3">
      {/* Search + Filter only */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400">{Icons.search}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 rounded-full bg-white/70 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>
        <button className="h-8 w-8 rounded-full border border-slate-200 grid place-items-center hover:bg-slate-50">
          {Icons.filter}
        </button>
      </div>

      {/* Header row + segmented toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Patient <span className="font-semibold text-slate-900">({items.length})</span>
        </div>
        <button className="text-sm text-cyan-600 hover:underline" onClick={onNewGroup}>
          New Patient Group
        </button>
      </div>

      <div className="bg-slate-100 rounded-full p-1 w-full max-w-xs flex">
        <button
          onClick={() => setMode("detailed")}
          className={`flex-1 h-9 rounded-full text-sm ${mode==="detailed"?"bg-cyan-500 text-white shadow":"text-slate-600"}`}
        >
          Detailed
        </button>
        <button
          onClick={() => setMode("summary")}
          className={`flex-1 h-9 rounded-full text-sm ${mode==="summary"?"bg-cyan-500 text-white shadow":"text-slate-600"}`}
        >
          Summary
        </button>
      </div>

      {/* Lists */}
      {mode === "detailed" ? (
        <ul className="space-y-3">
          {filtered.map((p, idx) => (
            <li key={p.id} className="relative overflow-hidden rounded-2xl border bg-white px-3 py-3 shadow-sm">
              <div className={`absolute right-1 top-1 h-[92%] w-1.5 rounded-full ${idx%2 ? "bg-cyan-400":"bg-slate-300"}`} />
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center shrink-0">
                  {Icons.home}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold leading-tight">{p.name}</div>
                      <div className="text-xs text-cyan-600">{p.role}</div>
                    </div>
                    <div className="text-[10px] text-slate-500">{p.time ?? "Today · 04:37 AM"}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-[14px_1fr] gap-y-1.5 gap-x-2 text-xs text-slate-600">
                    <span className="text-cyan-600 mt-0.5">{Icons.phone}</span><span>{p.phone ?? "—"}</span>
                    <span className="text-cyan-600 mt-0.5">{Icons.dot}</span><span>{p.clinician ?? "—"}</span>
                    <span className="text-cyan-600 mt-0.5">{Icons.dot}</span><span>{p.payer ?? "—"}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white overflow-hidden">
          {filtered.map((p) => (
            <li key={p.id} className="px-3 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-cyan-100 grid place-items-center text-cyan-700">{Icons.home}</div>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-cyan-600">{p.role}</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500">{p.time ?? "Today · 04:37 AM"}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
