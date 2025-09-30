"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";

export default function StaffSettingsPersonalPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "James Anderson",
    email: "dr.oliviashah@hospitalmail.com",
    phone: "",
    role: "Clinician",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: hook to your API action
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/staff/settings")}
            className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Personal Information</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <Card>
          <CardContent className="p-4">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Full Name</label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Email</label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Phone</label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Role</label>
                <Input value={form.role} onChange={(e) => set("role", e.target.value)} />
              </div>
              <div className="pt-2">
                <Button className="w-full" type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
