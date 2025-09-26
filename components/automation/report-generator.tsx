"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Calendar, TrendingUp, BarChart3, Clock } from "lucide-react";

type TemplateType = "progress" | "medication" | "appointments" | "wellness" | "comprehensive";
type Frequency = "daily" | "weekly" | "monthly" | "quarterly";
type GenStatus = "generating" | "completed" | "failed";

type ReportTemplate = {
  id: string;
  user_id: string;
  name: string;
  type: TemplateType;
  frequency: Frequency;
  recipients: string[];          // emails
  last_generated: string | null; // ISO
  next_scheduled: string | null; // ISO
  automated: boolean;
  created_at: string;
  updated_at: string;
};

type GeneratedReport = {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  type: TemplateType;
  generated_at: string;          // ISO
  status: GenStatus;
  file_size: string | null;
  download_url: string | null;
};

type ReportMetrics = {
  user_id: string;
  medication_adherence: number;      // %
  appointment_attendance: number;    // %
  wellness_score: number;            // 0-10
  activities_completed: number;
  total_appointments: number;
  missed_appointments: number;
  average_mood_score: number;        // 0-10
  recovery_milestones: number;
  updated_at: string;
};

export default function ReportGenerator() {
  const [uid, setUid] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);

  const getIcon = (type: string) =>
    type === "progress" ? <TrendingUp className="h-4 w-4" /> :
    type === "medication" ? <Clock className="h-4 w-4" /> :
    type === "appointments" ? <Calendar className="h-4 w-4" /> :
    type === "comprehensive" ? <BarChart3 className="h-4 w-4" /> :
    <FileText className="h-4 w-4" />;

  const statusColor = (s: GenStatus | string) =>
    s === "completed" ? "text-green-600" :
    s === "generating" ? "text-blue-600" :
    s === "failed" ? "text-red-600" : "text-gray-600";

  const loadAll = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;
    setUid(user.id);

    const [{ data: t }, { data: r }, { data: m }] = await Promise.all([
      supabase.from("report_templates").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("generated_reports").select("*").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(50),
      supabase.from("report_metrics").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    setTemplates((t as ReportTemplate[]) ?? []);
    setReports((r as GeneratedReport[]) ?? []);
    setMetrics((m as ReportMetrics) ?? null);

    // Seed defaults (first-time users)
    if (!t || t.length === 0) {
      await supabase.from("report_templates").insert([
        { user_id: user.id, name: "Weekly Progress Summary", type: "progress", frequency: "weekly", recipients: [user.email ?? "patient@example.com"], last_generated: null, next_scheduled: null, automated: true },
        { user_id: user.id, name: "Monthly Medication Adherence", type: "medication", frequency: "monthly", recipients: [user.email ?? "patient@example.com"], last_generated: null, next_scheduled: null, automated: true },
        { user_id: user.id, name: "Appointment History Report", type: "appointments", frequency: "monthly", recipients: [user.email ?? "patient@example.com"], last_generated: null, next_scheduled: null, automated: false },
        { user_id: user.id, name: "Comprehensive Recovery Report", type: "comprehensive", frequency: "quarterly", recipients: [user.email ?? "patient@example.com"], last_generated: null, next_scheduled: null, automated: true },
      ]);
      const { data: t2 } = await supabase.from("report_templates").select("*").eq("user_id", user.id).order("created_at");
      setTemplates((t2 as ReportTemplate[]) ?? []);
    }
    if (!m) {
      await supabase.from("report_metrics").insert({
        user_id: user.id,
        medication_adherence: 88,
        appointment_attendance: 92,
        wellness_score: 7.2,
        activities_completed: 15,
        total_appointments: 12,
        missed_appointments: 1,
        average_mood_score: 6.8,
        recovery_milestones: 3,
      } as Partial<ReportMetrics>);
      const { data: m2 } = await supabase.from("report_metrics").select("*").eq("user_id", user.id).maybeSingle();
      setMetrics((m2 as ReportMetrics) ?? null);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`reports:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "report_templates", filter: `user_id=eq.${uid}` }, async () => {
        const { data } = await supabase.from("report_templates").select("*").eq("user_id", uid).order("created_at");
        setTemplates((data as ReportTemplate[]) ?? []);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_reports", filter: `user_id=eq.${uid}` }, async () => {
        const { data } = await supabase.from("generated_reports").select("*").eq("user_id", uid).order("generated_at", { ascending: false }).limit(50);
        setReports((data as GeneratedReport[]) ?? []);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "report_metrics", filter: `user_id=eq.${uid}` }, async () => {
        const { data } = await supabase.from("report_metrics").select("*").eq("user_id", uid).maybeSingle();
        setMetrics((data as ReportMetrics) ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  async function toggleAutomation(templateId: string, next: boolean) {
    if (!uid) return;
    setTemplates((prev) => prev.map(t => t.id === templateId ? { ...t, automated: next } : t)); // optimistic
    await supabase.from("report_templates").update({ automated: next }).eq("id", templateId).eq("user_id", uid);
  }

  async function generateReport(templateId: string) {
    if (!uid) return;
    const t = templates.find(x => x.id === templateId);
    if (!t) return;

    const now = new Date();
    const name = `${t.name} - ${now.toLocaleDateString()}`;
    // Insert as generating
    const { data: inserted, error } = await supabase.from("generated_reports").insert({
      user_id: uid,
      template_id: t.id,
      name,
      type: t.type,
      generated_at: now.toISOString(),
      status: "generating",
      file_size: null,
      download_url: null,
    }).select("*").single();
    if (error) { alert(error.message); return; }

    // Simulate completion (replace with a worker in prod)
    setTimeout(async () => {
      const size = `${(Math.random() * 5 + 1).toFixed(1)} MB`;
      const url = `/reports/${t.type}-${Date.now()}.pdf`;
      await supabase.from("generated_reports").update({
        status: "completed",
        file_size: size,
        download_url: url,
      }).eq("id", inserted.id).eq("user_id", uid);

      await supabase.from("report_templates").update({
        last_generated: new Date().toISOString(),
      }).eq("id", t.id).eq("user_id", uid);
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-cyan-600" />
        <h2 className="text-2xl font-bold text-gray-900">Automated Report Generation</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Report Templates</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((t) => (
                  <div key={t.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getIcon(t.type)}
                        <div>
                          <h4 className="font-medium">{t.name}</h4>
                          <p className="text-sm text-gray-600">
                            {t.frequency} • {t.recipients?.length ?? 0} recipient(s)
                          </p>
                        </div>
                      </div>
                      <Switch checked={t.automated} onCheckedChange={(v) => toggleAutomation(t.id, !!v)} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Last generated:</span>
                        <span>{t.last_generated ? new Date(t.last_generated).toLocaleDateString() : "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Next scheduled:</span>
                        <span>{t.next_scheduled ? new Date(t.next_scheduled).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="capitalize">{t.type}</Badge>
                        <Badge variant={t.automated ? "default" : "secondary"}>{t.automated ? "Automated" : "Manual"}</Badge>
                      </div>
                      <Button size="sm" onClick={() => generateReport(t.id)} className="h-8">Generate Now</Button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && <div className="text-sm text-gray-500">No report templates yet.</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Current Period Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricRow label="Medication Adherence" value={`${metrics?.medication_adherence ?? 0}%`} progress={metrics?.medication_adherence ?? 0} />
                <MetricRow label="Appointment Attendance" value={`${metrics?.appointment_attendance ?? 0}%`} progress={metrics?.appointment_attendance ?? 0} />
                <MetricRow label="Wellness Score" value={`${metrics?.wellness_score ?? 0}/10`} progress={((metrics?.wellness_score ?? 0) / 10) * 100} />
                <MetricRow label="Activities Completed" value={`${metrics?.activities_completed ?? 0}`} progress={Math.min(100, ((metrics?.activities_completed ?? 0) / 20) * 100)} />
              </div>
              <div className="grid gap-4 md:grid-cols-3 mt-6 pt-4 border-t">
                <StatBox value={metrics?.total_appointments ?? 0} label="Total Appointments" color="text-cyan-600" />
                <StatBox value={metrics?.recovery_milestones ?? 0} label="Milestones Reached" color="text-green-600" />
                <StatBox value={metrics?.average_mood_score ?? 0} label="Average Mood" color="text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Reports</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    {getIcon(r.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{r.name}</h4>
                      <p className="text-xs text-gray-500">{new Date(r.generated_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${statusColor(r.status)}`}>{r.status}</span>
                      <span className="text-xs text-gray-500">{r.file_size ?? "—"}</span>
                    </div>
                    {r.status === "completed" && r.download_url && (
                      <Button size="sm" variant="ghost" className="h-6 px-2" asChild>
                        <a href={r.download_url} download><Download className="h-3 w-3" /></a>
                      </Button>
                    )}
                  </div>
                  {r.status === "generating" && <div className="mt-2"><Progress value={65} className="h-1" /></div>}
                </div>
              ))}
              {reports.length === 0 && <div className="text-sm text-gray-500">No reports yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricRow({ label, value, progress }: { label: string; value: string | number; progress: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{value}</span>
      </div>
      <Progress value={Number(progress) || 0} className="h-2" />
    </div>
  );
}
function StatBox({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
