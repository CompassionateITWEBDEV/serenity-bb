"use client";

import React, { useMemo, useState } from "react";

export type Broadcast = {
  id: string;
  title: string;           // e.g., "Everyone"
  body: string;            // short description
  timeLabel: string;       // e.g., "Yesterday – 04:37 AM"
};

type Props = {
  items?: Broadcast[];
  onNew?: () => void;
  variant?: "web" | "mobile"; // web: no bottom dock
};

const IconBtn: React.FC<React.PropsWithChildren<{ title?: string }>> = ({ title, children }) => (
  <button
    type="button"
    aria-label={title}
    title={title}
    className="h-8 w-8 rounded-full border border-slate-200 grid place-items-center hover:bg-slate-50 active:scale-[.98] transition"
  >
    {children}
  </button>
);

const Icons = {
  phone:   <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M2 5a3 3 0 0 1 3-3h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a3 3 0 0 1-3 3h-1C9.8 20.5 3.5 14.2 2 7V5z"/></svg>,
  calendar:<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2"/></svg>,
  chat:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/></svg>,
  mic:     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="9" y="2" width="6" height="12" rx="3" strokeWidth="2"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3" strokeWidth="2"/></svg>,
  bell:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0" strokeWidth="2"/></svg>,
  filter:  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 5h18M7 12h10M10 19h4"/></svg>,
  search:  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2"/><path d="M21 21l-4.3-4.3" strokeWidth="2"/></svg>,
  broadcast:<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 7v10M8 9v6M16 9v6"/><circle cx="12" cy="12" r="9" strokeWidth="2"/></svg>,
  inbox:   <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M20 7H4l-2 6 4 6h12l4-6-2-6z"/><path strokeWidth="2" d="M2 13h6a4 4 0 0 0 8 0h6"/></svg>,
  people:  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M16 11a4 4 0 1 0-8 0"/><path strokeWidth="2" d="M3 21a7 7 0 0 1 18 0"/></svg>,
  home:    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 10.5 12 3l9 7.5V21H6v-6H9v6H4z"/></svg>,
  settings:<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path strokeWidth="2" d="M19.4 15a1.6 1.6 0 0 0 .4 1.8l.1.1a2 2 0 1 1-2.9 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.4 1.6 1.6 0 0 0-1 1.5V22a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.4l-.1.1A2 2 0 1 1 3.2 19.7l.1-.1c.4-.5.5-1.2.4-1.8a1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1c.7 0 1.2-.4 1.5-1 .2-.6.1-1.3-.4-1.8l-.1-.1A2 2 0 1 1 5.9 3.2l.1.1c.5.4 1.2.5 1.8.4.6-.3 1-.8 1-1.5V2a2 2 0 1 1 4 0v.1c0 .7.4 1.2 1 1.5.6.1 1.3 0 1.8-.4l.1-.1A2 2 0 1 1 20.8 6l-.1.1c-.5.5-.6 1.2-.4 1.8.3.6.8 1 1.5 1H22a2 2 0 1 1 0 4h-.1c-.7 0-1.2.4-1.5 1z"/></svg>,
};

const SEED: Broadcast[] = [
  {
    id: "b1",
    title: "Everyone",
    body: "Broadcast for all staff members. Important updates and announcements will appear here.",
    timeLabel: "Yesterday – 04:37 AM",
  },
];

export default function Broadcasts({ items = SEED, onNew, variant = "web" }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(b =>
      (b.title + " " + b.body + " " + b.timeLabel).toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <section className="rounded-2xl bg-white/95 border border-slate-100 shadow-sm p-4 space-y-3">
      {/* action strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBtn title="Call">{Icons.phone}</IconBtn>
          <IconBtn title="Calendar">{Icons.calendar}</IconBtn>
          <IconBtn title="Chat">{Icons.chat}</IconBtn>
          <IconBtn title="Record">{Icons.mic}</IconBtn>
          <IconBtn title="Alerts">{Icons.bell}</IconBtn>
        </div>
        <span className="text-slate-400">•</span>
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

      {/* title row */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">Broadcasts</div>
        <button onClick={onNew} className="text-sm text-cyan-600 hover:underline">
          New Broadcast
        </button>
      </div>

      {/* list */}
      <ul className="space-y-3">
        {filtered.length === 0 ? (
          <li className="py-8 text-center text-slate-400 text-sm">No broadcasts</li>
        ) : (
          filtered.map((b) => (
            <li key={b.id} className="rounded-2xl border bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center shrink-0">
                  {Icons.broadcast}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-800">{b.title}</div>
                    <div className="text-[10px] text-slate-500">{b.timeLabel}</div>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{b.body}</p>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* optional mobile dock */}
      {variant === "mobile" && (
        <div className="mt-3 rounded-2xl bg-white border border-slate-100 px-4">
          <div className="flex justify-between py-3">
            <IconBtn title="Messages">{Icons.inbox}</IconBtn>
            <IconBtn title="Teams">{Icons.people}</IconBtn>
            <IconBtn title="Home">{Icons.home}</IconBtn>
            <IconBtn title="Settings">{Icons.settings}</IconBtn>
          </div>
        </div>
      )}
    </section>
  );
}
