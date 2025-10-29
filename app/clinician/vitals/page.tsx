// app/clinician/vitals/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Filter,
  HeartPulse,
  Search,
  Users,
  MessageSquare,
  Settings as SettingsIcon,
  Home as HomeIcon,
  TestTube2,
  Radio as RadioIcon,
  EyeOff,
  Bell,
  Stethoscope,
  Activity,
  Thermometer,
  Droplets,
  Zap,
  TrendingUp,
  Calendar,
  Clock,
} from "lucide-react";
import MobileDock from "@/components/staff/MobileDock";
import DashboardGlyph from "@/components/icons/DashboardGlyph";

type VitalSign = {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: string;
  temperature: number;
  bloodPressure: string;
  heartRate: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  status: 'normal' | 'elevated' | 'critical';
  notes?: string;
};

const MOCK_VITALS: VitalSign[] = [
  {
    id: "1",
    patientId: "p1",
    patientName: "John Smith",
    timestamp: "2024-01-15T10:30:00Z",
    temperature: 98.6,
    bloodPressure: "120/80",
    heartRate: 72,
    oxygenSaturation: 98,
    respiratoryRate: 16,
    status: 'normal',
    notes: "Patient feeling well"
  },
  {
    id: "2",
    patientId: "p2",
    patientName: "Sarah Johnson",
    timestamp: "2024-01-15T11:15:00Z",
    temperature: 99.2,
    bloodPressure: "135/85",
    heartRate: 85,
    oxygenSaturation: 95,
    respiratoryRate: 18,
    status: 'elevated',
    notes: "Mild fever, monitoring"
  },
  {
    id: "3",
    patientId: "p3",
    patientName: "Michael Brown",
    timestamp: "2024-01-15T12:00:00Z",
    temperature: 100.1,
    bloodPressure: "150/95",
    heartRate: 95,
    oxygenSaturation: 92,
    respiratoryRate: 22,
    status: 'critical',
    notes: "Requires immediate attention"
  },
];

export default function ClinicianVitalsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("today");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filteredVitals = MOCK_VITALS.filter((v) => 
      !q || 
      v.patientName.toLowerCase().includes(q) ||
      v.notes?.toLowerCase().includes(q)
    );

    if (statusFilter !== "all") {
      filteredVitals = filteredVitals.filter(v => v.status === statusFilter);
    }

    return filteredVitals;
  }, [query, statusFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      normal: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
      elevated: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
      critical: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.normal;
    
    return (
      <Badge className={`${config.bg} ${config.text} ${config.border} text-xs font-medium`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              <DashboardGlyph className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Clinician Console</h1>
              <p className="text-xs text-slate-500">Vital signs monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3 w-3" />
              Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Icon row - matching staff dashboard order */}
        <div className="flex items-center gap-3">
          {/* Core staff icons (kept consistent with staff dashboard) */}
          <IconPill aria="Dashboard" onClick={() => router.push("/staff/dashboard")}>
            <HomeIcon className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Drug Tests" onClick={() => router.push("/staff/dashboard?tab=tests")}>
            <TestTube2 className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Messages" onClick={() => router.push("/staff/messages")}>
            <MessageSquare className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Broadcasts" onClick={() => router.push("/staff/broadcasts")}>
            <RadioIcon className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Groups" onClick={() => router.push("/staff/hidden-groups")}>
            <EyeOff className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Group Chat" onClick={() => router.push("/staff/group-chat")}>
            <MessageSquare className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Alerts" onClick={() => router.push("/staff/notifications")}>
            <Bell className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Clinicians" onClick={() => router.push("/clinician/dashboard")}>
            <Stethoscope className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Settings" onClick={() => router.push("/staff/profile")}>
            <SettingsIcon className="h-5 w-5" />
          </IconPill>

          {/* Divider then clinician-only extras */}
          <span aria-hidden className="mx-1 h-5 w-px bg-slate-300" />

          <IconPill aria="Vitals" active onClick={() => router.push("/clinician/vitals")}>
            <HeartPulse className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Patients" onClick={() => router.push("/clinician/patients")}>
            <Users className="h-5 w-5" />
          </IconPill>
        </div>

        {/* Search / Filter */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients, notes..."
              className="pl-10 h-10 rounded-full border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-40 rounded-full border-slate-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="elevated">Elevated</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 rounded-full border-slate-300 hover:border-cyan-400 hover:bg-cyan-50">
              <Filter className="h-4 w-4 mr-2 text-cyan-600" />
              Filter
            </Button>
            <span className="text-sm text-slate-600 font-medium">
              {filtered.length} of {MOCK_VITALS.length} records
            </span>
          </div>
        </div>

        {/* Vital Signs List */}
        <div className="grid gap-4">
          {filtered.map((vital) => (
            <Card key={vital.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-200 flex items-center justify-center text-cyan-700 font-semibold">
                      {vital.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{vital.patientName}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatTime(vital.timestamp)}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(vital.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Thermometer className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Temperature</div>
                      <div className="font-semibold text-slate-800">{vital.temperature}°F</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Activity className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Blood Pressure</div>
                      <div className="font-semibold text-slate-800">{vital.bloodPressure}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <HeartPulse className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Heart Rate</div>
                      <div className="font-semibold text-slate-800">{vital.heartRate} bpm</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Droplets className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Oxygen Sat</div>
                      <div className="font-semibold text-slate-800">{vital.oxygenSaturation}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Respiratory</div>
                      <div className="font-semibold text-slate-800">{vital.respiratoryRate}/min</div>
                    </div>
                  </div>
                  </div>

                {vital.notes && (
                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <strong>Notes:</strong> {vital.notes}
                  </div>
                )}
              </CardContent>
            </Card>
              ))}
          
              {filtered.length === 0 && (
            <Card className="shadow-sm">
              <CardContent className="p-12 text-center text-slate-500">
                <div className="text-lg font-medium mb-2">No vital signs found</div>
                <div className="text-sm">Try adjusting your search or filter criteria</div>
          </CardContent>
        </Card>
          )}
        </div>
      </main>

      <MobileDock />
    </div>
  );
}

function IconPill({
  children,
  active,
  onClick,
  aria,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  aria: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      title={title}
      onClick={onClick}
      className={`h-10 w-10 rounded-full grid place-items-center transition
        ${active ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300"
                 : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );
}