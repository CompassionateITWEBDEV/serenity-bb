"use client";

import React, { useMemo, useState } from "react";

export type HiddenGroup = {
  id: string;
  name: string;
  subtitleTop: string;
  subtitleBottom: string;
  status?: "dot" | "none";
};

type Props = {
  items?: HiddenGroup[];
  onAdd?: () => void;
};

const IconBtn: React.FC<React.PropsWithChildren<{ title?: string }>> = ({ title, children }) => (
  <button
    aria-label={title}
    title={title}
    className="h-8 w-8 rounded-full border border-slate-200 grid place-items-center hover:bg-slate-50 active:scale-[.98] transition"
  >
    {children}
  </button>
);

const Icons = {
  home:     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z"/></svg>,
  people:   <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M16 11a4 4 0 1 0-8 0"/><path strokeWidth="2" d="M3 21a7 7 0 0 1 18 0"/></svg>,
  bell:     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0" strokeWidth="2"/></svg>,
  mic:      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="9" y="2" width="6" height="12" rx="3" strokeWidth="2"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3" strokeWidth="2"/></svg>,
  calendar: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2"/></svg>,
  search:   <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2"/><path d="M21 21l-4.3-4.3" strokeWidth="2"/></svg>,
  filter:   <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 5h18M7 12h10M10 19h4"/></svg>,
  groupAva: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
      <circle cx="9" cy="9" r="3" strokeWidth="2" />
      <path d="M2 21a7 7 0 0 1 14 0" strokeWidth="2" />
      <circle cx="17" cy="7" r="2" strokeWidth="2" />
      <path d="M17 12a5 5 0 0 1 5 5" strokeWidth="2" />
    </svg>
  ),
};

const SEED: HiddenGroup[] = [
  {
    id: "h1",
    name: "Christine Mccloud",
    subtitleTop: "Vitals stable. All services active.",
    subtitleBottom: "Dr. Isaac – Medicare Plus Blue",
    status: "dot",
  },
];

export default function HiddenGroups({ items = SEED, onAdd }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(s) ||
        i.subtitleTop.toLowerCase().includes(s) ||
        i.subtitleBottom.toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <section className="rounded-2xl bg-white/95 border border-slate-100 shadow-sm p-4 space-y-3">
      {/* top actions like Figma pill strip */}
      <div className="mx-auto w-full max-w-xs rounded-full bg-slate-100 flex items-center justify-center gap-3 px-2 py-2">
        <IconBtn title="Home">{Icons.home}</IconBtn>
        <IconBtn title="Teams">{Icons.people}</IconBtn>
        <IconBtn title="Record">{Icons.mic}</IconBtn>
        <IconBtn title="Alerts">{Icons.bell}</IconBtn>
        <IconBtn title="Mute">{Icons.calendar}</IconBtn>
      </div>

      {/* search + filter */}
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
        <IconBtn title="Filter">{Icons.filter}</IconBtn>
      </div>

      {/* header row */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">Hidden Groups <span className="font-normal text-slate-400">({items.length})</span></div>
        <button onClick={onAdd} className="text-sm text-cyan-600 hover:underline">Add Group</button>
      </div>

      {/* list */}
      <ul className="space-y-3">
        {filtered.length === 0 ? (
          <li className="py-10 text-center text-slate-400 text-sm">No hidden groups</li>
        ) : (
          filtered.map((g) => (
            <li key={g.id} className="flex items-start gap-3 rounded-xl border bg-white p-3">
              <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center">{Icons.groupAva}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800">{g.name}</div>
                <div className="text-xs text-slate-500">{g.subtitleTop}</div>
                <div className="text-xs text-cyan-700">{g.subtitleBottom}</div>
              </div>
              {g.status === "dot" && <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 mt-2" />}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
