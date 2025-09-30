// components/staff/MessagePanel.tsx
import React, { useMemo, useState } from "react";

export type MessageItem = {
  id: string;
  name: string;
  subtitleTop: string;
  subtitleBottom: string;
  rightStatus?: "ok" | "dot" | "none";
};

type Props = {
  title: string;
  newLabel: string;
  items: MessageItem[];
  onNew?: () => void;
};

const IconWrap: React.FC<React.PropsWithChildren<{ title?: string; className?: string }>> = ({ title, className, children }) => (
  <button
    type="button"
    aria-label={title}
    title={title}
    className={`h-8 w-8 rounded-full border border-slate-200 grid place-items-center hover:bg-slate-50 active:scale-[.98] transition ${className||""}`}
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
  plus:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 5v14M5 12h14"/></svg>,
  check:   <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor"><path strokeWidth="3" d="M20 6 9 17l-5-5"/></svg>,
  inbox:   <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M20 7H4l-2 6 4 6h12l4-6-2-6z"/><path strokeWidth="2" d="M2 13h6a4 4 0 0 0 8 0h6"/></svg>,
  people:  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M16 11a4 4 0 1 0-8 0M3 21a7 7 0 0 1 18 0"/></svg>,
  home:    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H4z"/></svg>,
  settings:<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path strokeWidth="2" d="M19.4 15a1.7 1.7 0 0 0 .4 1.8l.1.1a2 2 0 1 1-2.9 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.4 1.7 1.7 0 0 0-1 1.5V22a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.4l-.1.1A2 2 0 1 1 3.2 19.7l.1-.1c.4-.5.5-1.2.4-1.8a1.7 1.7 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1c.7 0 1.2-.4 1.5-1 .2-.6.1-1.3-.4-1.8l-.1-.1A2 2 0 1 1 5.9 3.2l.1.1c.5.4 1.2.5 1.8.4.6-.3 1-.8 1-1.5V2a2 2 0 1 1 4 0v.1c0 .7.4 1.2 1 1.5.6.1 1.3 0 1.8-.4l.1-.1A2 2 0 1 1 20.8 6l-.1.1c-.5.5-.6 1.2-.4 1.8.3.6.8 1 1.5 1H22a2 2 0 1 1 0 4h-.1c-.7 0-1.2.4-1.5 1z"/></svg>,
};

const Avatar = () => (
  <div className="h-10 w-10 rounded-full bg-teal-100 grid place-items-center text-slate-600 font-semibold">G</div>
);
const StatusDot: React.FC<{ type?: "ok" | "dot" | "none" }> = ({ type }) => {
  if (!type || type === "none") return null;
  return type === "ok"
    ? <div className="h-5 w-5 rounded-full grid place-items-center bg-teal-100 text-teal-700">{Icons.check}</div>
    : <div className="h-5 w-5 rounded-full bg-teal-400" />;
};

export default function MessagePanel({ title, newLabel, items, onNew }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(i =>
      (i.name + i.subtitleTop + i.subtitleBottom).toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <div className="rounded-2xl p-4 space-y-4 bg-white/90 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <IconWrap title="Call">{Icons.phone}</IconWrap>
          <IconWrap title="Calendar">{Icons.calendar}</IconWrap>
          <IconWrap title="Chat">{Icons.chat}</IconWrap>
          <IconWrap title="Record">{Icons.mic}</IconWrap>
          <IconWrap title="Alerts">{Icons.bell}</IconWrap>
        </div>
        <span className="text-slate-400">•</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400">{Icons.search}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label={`${title} search`}
            className="w-full pl-9 pr-3 py-2 rounded-full bg-white/70 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>
        <IconWrap title="Filter">{Icons.filter}</IconWrap>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">
          {title} <span className="font-normal text-slate-400">({items.length})</span>
        </div>
        <button onClick={onNew} className="text-sm text-teal-600 inline-flex items-center gap-1 hover:underline">
          {Icons.plus} {newLabel}
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No results</div>
        ) : (
          filtered.map((it) => (
            <button key={it.id} className="w-full flex items-start gap-3 py-3 text-left hover:bg-slate-50 px-2 rounded-xl">
              <Avatar />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800">{it.name}</div>
                <div className="text-xs text-slate-500 leading-snug">
                  <div>{it.subtitleTop}</div>
                  <div className="text-teal-700">{it.subtitleBottom}</div>
                </div>
              </div>
              <StatusDot type={it.rightStatus} />
            </button>
          ))
        )}
      </div>

      {/* Mini bottom nav (static) */}
      <div className="mt-2 rounded-2xl bg-white border border-slate-100 px-4">
        <div className="flex justify-between py-3">
          <IconWrap title="Messages" className="!h-10 !w-10">{Icons.inbox}</IconWrap>
          <IconWrap title="Teams" className="!h-10 !w-10">{Icons.people}</IconWrap>
          <IconWrap title="Home" className="!h-10 !w-10">{Icons.home}</IconWrap>
          <IconWrap title="Settings" className="!h-10 !w-10">{Icons.settings}</IconWrap>
        </div>
      </div>
    </div>
  );
}
