// components/staff/Groups.tsx
import React, { useMemo, useState } from "react";

/** Groups-only panel (Internal Groups). TailwindCSS required. */

export type ThreadItem = {
  id: string;
  name: string;
  subtitleTop: string;
  subtitleBottom: string;
  rightStatus?: "ok" | "dot" | "none";
};

type Props = {
  title?: string;
  newLabel?: string;
  items?: ThreadItem[];
  onCreateGroup?: () => void;
};

/* ---------- icons (minimal set) ---------- */
const IconWrap: React.FC<{ title?: string; className?: string }> = ({ title, className, children }) => (
  <button
    aria-label={title}
    title={title}
    className={`h-8 w-8 rounded-full border border-slate-200 grid place-items-center hover:bg-slate-50 active:scale-[.98] transition ${className || ""}`}
  >
    {children}
  </button>
);

const Icons = {
  phone:   <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M2 5a3 3 0 0 1 3-3h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a3 3 0 0 1-3 3h-1C9.82 20.5 3.5 14.18 2 7V5z"/></svg>,
  calendar:<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2"/></svg>,
  chat:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/></svg>,
  mic:     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="9" y="2" width="6" height="12" rx="3" strokeWidth="2"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3" strokeWidth="2"/></svg>,
  bell:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="2"/></svg>,
  filter:  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 5h18M7 12h10M10 19h4"/></svg>,
  search:  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2"/><path d="M21 21l-4.3-4.3" strokeWidth="2"/></svg>,
  check:   <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor"><path strokeWidth="3" d="M20 6 9 17l-5-5"/></svg>,
  plus:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 5v14M5 12h14"/></svg>,
};

/* ---------- UI atoms ---------- */
const ActionBar: React.FC = () => (
  <div className="flex items-center gap-2">
    <IconWrap title="Call">{Icons.phone}</IconWrap>
    <IconWrap title="Calendar">{Icons.calendar}</IconWrap>
    <IconWrap title="Chat">{Icons.chat}</IconWrap>
    <IconWrap title="Record">{Icons.mic}</IconWrap>
    <IconWrap title="Alerts">{Icons.bell}</IconWrap>
  </div>
);

const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; ariaLabel?: string }> = ({
  value, onChange, ariaLabel,
}) => (
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

const GroupRow: React.FC<{ item: ThreadItem }> = ({ item }) => (
  <button
    className="w-full text-left flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
    aria-label={`Open ${item.name}`}
  >
    <Avatar />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-slate-800">{item.name}</div>
      <div className="text-xs text-slate-500 leading-snug">
        <div>{item.subtitleTop}</div>
        <div className="text-teal-700">{item.subtitleBottom}</div>
      </div>
    </div>
    <StatusDot type={item.rightStatus} />
  </button>
);

/* ---------- Component ---------- */
export default function Groups({
  title = "Internal Groups",
  newLabel = "New Internal Group",
  items = SEED_GROUPS,
  onCreateGroup,
}: Props) {
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
    <div className="rounded-2xl p-4 space-y-4 bg-white/90 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between">
        <ActionBar />
        <div className="text-sm text-slate-400">•</div>
      </div>

      <SearchBar value={query} onChange={setQuery} ariaLabel={`${title} search`} />

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-600">
          {title} <span className="font-normal text-slate-400">({items.length})</span>
        </div>
        <button
          className="text-sm text-teal-600 hover:underline inline-flex items-center gap-1"
          onClick={onCreateGroup}
        >
          {Icons.plus} {newLabel}
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No results</div>
        ) : (
          filtered.map((t) => <GroupRow key={t.id} item={t} />)
        )}
      </div>
    </div>
  );
}

/* ---------- sample seed (safe to remove) ---------- */
const SEED_GROUPS: ThreadItem[] = [
  { id: "g1", name: "Christine Mccloud", subtitleTop: "Vitals stable. All services active.", subtitleBottom: "Dr. Isaac – Medicare Plus Blue", rightStatus: "dot" },
  { id: "g2", name: "Robert Mccloud",    subtitleTop: "Therapy ready. Full care team.",      subtitleBottom: "Dr. Parker – MPB PPO",         rightStatus: "none" },
  { id: "g3", name: "Rhonda Fairley",    subtitleTop: "Wound care ongoing. SN only.",        subtitleBottom: "Dr. Packey – MCARE ADV",        rightStatus: "dot" },
  { id: "g4", name: "Emma McElroy",      subtitleTop: "Auth hold. No new updates.",          subtitleBottom: "Dr. Palfy – Wellcare HMO",      rightStatus: "none" },
  { id: "g5", name: "Adrian Foster",     subtitleTop: "Vitals improved after visit.",        subtitleBottom: "Dr. Moore – United HealthCare", rightStatus: "none" },
  { id: "g6", name: "Lana Jenkins",      subtitleTop: "Medication adjusted today.",          subtitleBottom: "Dr. Patel – Aetna Gold Plan",   rightStatus: "ok" },
];
