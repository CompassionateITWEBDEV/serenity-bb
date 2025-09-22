"use client";
import { useDashboardData } from "./useDashboardData";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data, error, loading } = useDashboardData();

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-6">No data.</div>;

  const { kpis, treatmentProgress, upcomingAppointments, weeklyGoals, tokenStats, wellness, activity } = data;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-gray-600">Sessions</div><div className="text-2xl font-semibold">{kpis.sessions}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-gray-600">Goals</div><div className="text-2xl font-semibold">{kpis.goals}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-gray-600">Tokens</div><div className="text-2xl font-semibold">{kpis.tokens}</div></CardContent></Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="text-sm">{kpis.progressPercent}%</div>
            </div>
            <Progress value={kpis.progressPercent} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Treatment progress list */}
      <Card>
        <CardHeader><CardTitle>Treatment Progress</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {treatmentProgress.length === 0 ? (
            <div className="text-sm text-gray-500">No milestones yet.</div>
          ) : treatmentProgress.map((m) => (
            <div key={m.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-gray-500">{m.type} • {m.date ? new Date(m.date).toLocaleDateString() : ""}</div>
              </div>
              <div className={`text-xs ${m.status === "Completed" ? "text-green-600" : "text-gray-600"}`}>{m.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upcoming appointments */}
      <Card>
        <CardHeader><CardTitle>Upcoming Appointments</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {upcomingAppointments.length === 0 ? (
            <div className="text-sm text-gray-500">No upcoming appointments.</div>
          ) : upcomingAppointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{new Date(a.at).toLocaleString()}</div>
                <div className="text-xs text-gray-500">{a.staff ?? "TBD"} • {a.status}</div>
              </div>
              {a.notes && <div className="text-xs text-gray-500 max-w-sm truncate">{a.notes}</div>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Wellness + tokens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Daily Wellness</CardTitle></CardHeader>
          <CardContent>
            {wellness ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">{wellness.week}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div><div className="text-xs text-gray-500">Wellness</div><Progress value={wellness.wellness * 10} className="h-2" /></div>
                  <div><div className="text-xs text-gray-500">Attendance</div><Progress value={wellness.attendance} className="h-2" /></div>
                  <div><div className="text-xs text-gray-500">Goals</div><Progress value={wellness.goals} className="h-2" /></div>
                </div>
              </div>
            ) : <div className="text-sm text-gray-500">No wellness data.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Reward Tokens</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between"><span>Total</span><span>{tokenStats.total}</span></div>
            <div className="flex justify-between"><span>Earned</span><span>{tokenStats.earned}</span></div>
            <div className="flex justify-between"><span>Spent</span><span>{tokenStats.spent}</span></div>
            <div className="flex justify-between"><span>Level</span><span>{tokenStats.level}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Activity feed */}
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {activity.length === 0 ? (
            <div className="text-sm text-gray-500">No recent activity.</div>
          ) : activity.map((a) => (
            <div key={a.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{a.summary}</div>
                <div className="text-xs text-gray-500">{new Date(a.ts).toLocaleString()} • {a.kind}{a.meta ? ` • ${a.meta}` : ""}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
