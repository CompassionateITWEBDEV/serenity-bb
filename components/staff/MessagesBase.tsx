// components/staff/MessagesBase.tsx
import React, { useMemo, useState } from "react";

type ThreadKind = "group" | "dm";
type ThreadItem = {
  id: string;
  kind: ThreadKind;
  name: string;
  subtitleTop: string;
  subtitleBottom: string;
  rightStatus?: "ok" | "dot" | "none";
};

const IconWrap: React.FC<{ title?: string; className?: string }> = ({
  title, className, children,
}) => (
  <button
    aria-label={title}
    title={title}
    className={`h-8 w-8 rounded-full border border-slate-200 grid place-items-center hover:bg-slate-50 active:scale-[.98] transition ${className || ""}`}
  >
    {children}
  </button>
);

const Icons = {
  phone: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M2 5a3 3 0 0 1 3-3h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a3 3 0 0 1-3 3h-1C9.82 20.5 3.5 14.18 2 7V5z"/></svg>),
  calendar: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2"/></svg>),
  chat: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/></svg>),
  mic: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="9" y="2" width="6" height="12" rx="3" strokeWidth="2"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3" strokeWidth="2"/></svg>),
  bell: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="2"/></svg>),
  filter: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 5h18M7 12h10M10 19h4"/></svg>),
  search: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2"/><path d="M21 21l-4.3-4.3" strokeWidth="2"/></svg>),
  check: (<svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor"><path strokeWidth="3" d="M20 6 9 17l-5-5"/></svg>),
  plus: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 5v14M5 12h14"/></svg>),
  home: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4z"/></svg>),
  people: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M16 11a4 4 0 1 0-8 0M3 21a7 7 0 0 1 18 0"/></svg>),
  inbox: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M20 7H4l-2 6 4 6h12l4-6-2-6z"/><path strokeWidth="2" d="M2 13h6a4 4 0 0 0 8 0h6"/></svg>),
  settings: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path strokeWidth="2" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 1 1-4 0v-.07a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 3.2 19.7l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.07c-.69 0-1.26.39-1.51 1z"/></svg>),
  msg: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" strokeWidth="2"/></svg>),
};

const ActionBar: React.FC = () => (
  <div className="flex items-center gap-2">
    <IconWrap title="Call">{Icons.phone}</IconWrap>
    <IconWrap title="Calendar">{Icons.calendar}</IconWrap>
    <IconWrap title="Chat">{Icons.chat}</IconWrap>
    <IconWrap title="Record">{Icons.mic}</IconWrap>
    <IconWrap title="Alerts">{Icons.bell}</IconWrap>
  </div>
);

const SearchBar: React.FC<{
  value: string; onChange: (v: string) => void; ariaLabel?: string;
}> = ({ value, onChange, ariaLabel }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 relative">
      <span className="absolute left-3 top-2.5 text-slate-400">{Icons.search}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        placeholder="Search"
        className="w-full pl-9 pr-3 py-2 rounded-full bg-white/70 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
      />
    </div>
    <IconWrap title="Filter">{Icons.filter}</IconWrap>
  </div>
);

const Avatar: React.FC = () => (
  <div className="h-10 w-10 rounded-full bg-teal-100 grid place-items-center text-slate-600 font-semibold">G</div>
);

const StatusDot: React.FC<{ type?: "ok" | "dot" | "none" }> = ({ type }) => {
  if (type === "none") return null;
  const base = "h-5 w-5 rounded-full grid place-items-center border border-transparent";
  return type === "ok" ? (
    <div className={`${base} bg-teal-100 text-teal-600`}>{Icons.check}</div>
  ) : (
    <div className={`${base} bg-teal-400`} />
  );
};

const ThreadRow: React.FC<{ item: ThreadItem; compact?: boolean }> = ({ item, compact }) => (
  <button
    className={`w-full text-left flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300 ${compact ? "py-2" : ""}`}
    aria-label={`Open ${item.name}`}
  >
    <Avatar />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-slate-800">{item.name}</div>
      {compact ? (
        <div className="text-xs text-slate-500 truncate">{item.subtitleTop}</div>
      ) : (
        <div className="text-xs text-slate-500 leading-snug">
          <div>{item.subtitleTop}</div>
          <div className="text-teal-700">{item.subtitleBottom}</div>
        </div>
      )}
    </div>
    <StatusDot type={item.rightStatus} />
  </button>
);

const ThreadsPanel: React.FC<{
  title: string; newLabel: string; items: ThreadItem[]; compact?: boolean;
}> = ({ title, newLabel, items, compact }) => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.subtitleTop.toLowerCase().includes(q) ||
        i.subtitleBottom.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="card bg-white/90 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <ActionBar />
        <div className="text-sm text-slate-400">•</div>
      </div>

      <SearchBar value={query} onChange={setQuery} ariaLabel={`${title} search`} />

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-600">
          {title} <span className="font-normal text-slate-400">({items.length})</span>
        </div>
        <button className="text-sm text-teal-600 hover:underline inline-flex items-center gap-1">
          {Icons.plus} {newLabel}
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No results</div>
        ) : (
          filtered.map((t) => <ThreadRow key={t.id} item={t} compact={compact} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
};

const BottomNav: React.FC = () => (
  <div className="mt-2 bg-white rounded-2xl border border-slate-100 px-4">
    <div className="flex items-center justify-between py-3">
      {/* Single Messages icon (page you’re on) */}
      <IconWrap title="Messages" className="!h-10 !w-10 ring-2 ring-teal-300">{Icons.msg}</IconWrap>
      <IconWrap title="Teams" className="!h-10 !w-10">{Icons.people}</IconWrap>
      <IconWrap title="Home" className="!h-10 !w-10">{Icons.home}</IconWrap>
      <IconWrap title="Notifications" className="!h-10 !w-10">{Icons.bell}</IconWrap>
      <IconWrap title="Settings" className="!h-10 !w-10">{Icons.settings}</IconWrap>
    </div>
  </div>
);

/* ---- seed data ---- */
const SEED_GROUPS: ThreadItem[] = [
  { id:"g1", kind:"group", name:"Christine Mccloud", subtitleTop:"Vitals stable. All services active.", subtitleBottom:"Dr. Isaac – Medicare Plus Blue", rightStatus:"dot" },
  { id:"g2", kind:"group", name:"Robert Mccloud",   subtitleTop:"Therapy ready. Full care team.",    subtitleBottom:"Dr. Parker – MPB PPO",      rightStatus:"none" },
  { id:"g3", kind:"group", name:"Rhonda Fairley",   subtitleTop:"Wound care ongoing. SN only.",      subtitleBottom:"Dr. Packey – MCARE ADV",     rightStatus:"dot" },
  { id:"g4", kind:"group", name:"Emma McElroy",     subtitleTop:"Auth hold. No new updates.",        subtitleBottom:"Dr. Palfy – Wellcare HMO",   rightStatus:"none" },
  { id:"g5", kind:"group", name:"Adrian Foster",    subtitleTop:"Vitals improved after visit.",       subtitleBottom:"Dr. Moore – United HealthCare", rightStatus:"none" },
  { id:"g6", kind:"group", name:"Lana Jenkins",     subtitleTop:"Medication adjusted today.",         subtitleBottom:"Dr. Patel – Aetna Gold Plan", rightStatus:"ok" },
];

const SEED_DMS: ThreadItem[] = [
  { id:"d1", kind:"dm", name:"Bria Patterson",   subtitleTop:"Happy Friday team!!!",            subtitleBottom:"Thanks for all You...", rightStatus:"dot" },
  { id:"d2", kind:"dm", name:"Robert Mccloud",   subtitleTop:"Therapy ready. Full care team.",  subtitleBottom:"Thanks for all You...", rightStatus:"none" },
  { id:"d3", kind:"dm", name:"Rhonda Fairley",   subtitleTop:"Wound care ongoing. SN only.",     subtitleBottom:"Thanks for all You...", rightStatus:"none" },
  { id:"d4", kind:"dm", name:"Emma McElroy",     subtitleTop:"Auth hold. No new updates.",       subtitleBottom:"Thanks for all You...", rightStatus:"none" },
  { id:"d5", kind:"dm", name:"Adrian Foster",    subtitleTop:"Vitals improved after visit.",      subtitleBottom:"Thanks for all You...", rightStatus:"none" },
  { id:"d6", kind:"dm", name:"Lana Jenkins",     subtitleTop:"Medication adjusted today.",        subtitleBottom:"Thanks for all You...", rightStatus:"ok" },
];

export default function MessagesBase() {
  const [mode, setMode] = useState<"detailed" | "summary">("detailed"); // one toggle for both lists

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        {/* One Messages icon + Detailed/Summary toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconWrap title="Messages" className="!h-10 !w-10 ring-2 ring-teal-300">{Icons.msg}</IconWrap>
            <div className="text-slate-700 font-semibold">Messages</div>
          </div>

          <div className="bg-slate-100 rounded-full p-1 flex w-[220px]">
            <button
              onClick={() => setMode("detailed")}
              className={`flex-1 h-9 rounded-full text-sm ${mode === "detailed" ? "bg-teal-500 text-white shadow" : "text-slate-600"}`}
            >Detailed</button>
            <button
              onClick={() => setMode("summary")}
              className={`flex-1 h-9 rounded-full text-sm ${mode === "summary" ? "bg-teal-500 text-white shadow" : "text-slate-600"}`}
            >Summary</button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:justify-self-end w-full max-w-[420px]">
            <ThreadsPanel
              title="Internal Groups"
              newLabel="New Internal Group"
              items={SEED_GROUPS}
              compact={mode === "summary"}
            />
          </div>
          <div className="md:justify-self-start w-full max-w-[420px]">
            <ThreadsPanel
              title="Direct Messages"
              newLabel="New Messages"
              items={SEED_DMS}
              compact={mode === "summary"}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
