"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MobileDock from "@/components/staff/MobileDock";
import {
  Bell,
  CheckCircle2,
  Info,
  XCircle,
  ChevronLeft,
} from "lucide-react";

type Status = "success" | "info" | "error";
type Notice = {
  id: string;
  status: Status;
  title: string;
  body: string;
  at: string; // ISO or pretty date
  read: boolean;
};

const MOCKS: Notice[] = [
  {
    id: "n1",
    status: "success",
    title: "Your Take-Home Medication Is Ready!",
    body: "View your results securely and get expert insights from your doctor.",
    at: "23 Jan 2023 at 3:45 pm",
    read: false,
  },
  {
    id: "n2",
    status: "info",
    title: "Your Appointment Is Confirmed",
    body: "View your results securely and get expert insights from your doctor.",
    at: "23 Jan 2023 at 3:45 pm",
    read: false,
  },
  {
    id: "n3",
    status: "error",
    title: "Your Appointment Is Rejected",
    body: "View your results securely and get expert insights from your doctor.",
    at: "23 Jan 2023 at 3:45 pm",
    read: false,
  },
  {
    id: "n4",
    status: "success",
    title: "Your Blood Test Is Ready",
    body: "View your results securely and get expert insights from your doctor.",
    at: "23 Jan 2023 at 3:45 pm",
    read: false,
  },
];

function StatusDot({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    success: "bg-emerald-100 text-emerald-600",
    info: "bg-cyan-100 text-cyan-600",
    error: "bg-rose-100 text-rose-600",
  };
  const Icon = status === "success" ? CheckCircle2 : status === "info" ? Info : XCircle;
  return (
    <span className={`h-7 w-7 rounded-full grid place-items-center ${map[status]}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default function StaffNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notice[]>(MOCKS);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center relative">
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/staff/dashboard")}
            className="absolute left-4 h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 grid place-items-center"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-cyan-600" />
            <h1 className="text-lg font-semibold">Notifications</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id} className="px-4 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <StatusDot status={n.status} />
                    <div>
                      <div className={`font-medium ${n.read ? "text-slate-500" : "text-slate-900"}`}>
                        {n.title}
                      </div>
                      <p className="text-sm text-slate-600">{n.body}</p>
                      <div className="text-xs text-slate-500 mt-2">{n.at}</div>
                    </div>
                  </div>
                  <div className="pt-1">
                    {!n.read ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-slate-800"
                        onClick={() => markRead(n.id)}
                      >
                        Mark as read
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">Read</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>

      <MobileDock />
    </div>
  );
}
