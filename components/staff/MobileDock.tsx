"use client";

import { MessageSquare, Users, Home as HomeIcon, Bell, Settings } from "lucide-react";

export default function MobileDock() {
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center md:hidden pointer-events-none">
      <div className="pointer-events-auto w-[320px] rounded-3xl bg-white border shadow-xl px-4 py-2 flex items-center justify-between">
        <DockBtn Icon={MessageSquare} label="Chat" />
        <DockBtn Icon={Users} label="Groups" />
        <DockBtn Icon={HomeIcon} label="Home" prominent />
        <DockBtn Icon={Bell} label="Alerts" />
        <DockBtn Icon={Settings} label="Settings" />
      </div>
    </div>
  );
}

function DockBtn({ Icon, label, prominent }: { Icon: any; label: string; prominent?: boolean }) {
  return (
    <button
      className={`grid place-items-center ${
        prominent ? "h-11 w-11 rounded-full text-white bg-cyan-600" : "h-9 w-9 rounded-full bg-slate-100 text-slate-600"
      }`}
      aria-label={label}
      title={label}
    >
      <Icon className={prominent ? "h-5 w-5" : "h-4 w-4"} />
    </button>
  );
}
