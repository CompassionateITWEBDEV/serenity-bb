// app/clinician/patients/page.tsx
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
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
} from "lucide-react";
import MobileDock from "@/components/staff/MobileDock";
import DashboardGlyph from "@/components/icons/DashboardGlyph";

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  admissionDate: string;
  status: 'active' | 'discharged' | 'pending';
  room: string;
  diagnosis: string;
  assignedClinician: string;
  lastVisit: string;
  nextAppointment?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
};

const MOCK_PATIENTS: Patient[] = [
  {
    id: "1",
    name: "John Smith",
    age: 45,
    gender: "Male",
    admissionDate: "2024-01-10",
    status: 'active',
    room: "Room 101",
    diagnosis: "Substance Use Disorder",
    assignedClinician: "Dr. Marlin Cooper",
    lastVisit: "2024-01-15T10:30:00Z",
    nextAppointment: "2024-01-16T14:00:00Z",
    phone: "(555) 123-4567",
    email: "john.smith@email.com",
    emergencyContact: "Jane Smith (555) 123-4568"
  },
  {
    id: "2",
    name: "Sarah Johnson",
    age: 32,
    gender: "Female",
    admissionDate: "2024-01-12",
    status: 'active',
    room: "Room 102",
    diagnosis: "Alcohol Dependence",
    assignedClinician: "Dr. Sarah Jennings",
    lastVisit: "2024-01-15T11:15:00Z",
    nextAppointment: "2024-01-17T09:30:00Z",
    phone: "(555) 234-5678",
    email: "sarah.johnson@email.com",
    emergencyContact: "Mike Johnson (555) 234-5679"
  },
  {
    id: "3",
    name: "Michael Brown",
    age: 28,
    gender: "Male",
    admissionDate: "2024-01-08",
    status: 'active',
    room: "Room 103",
    diagnosis: "Opioid Use Disorder",
    assignedClinician: "Dr. Emily Roberts",
    lastVisit: "2024-01-15T12:00:00Z",
    nextAppointment: "2024-01-16T16:00:00Z",
    phone: "(555) 345-6789",
    email: "michael.brown@email.com",
    emergencyContact: "Lisa Brown (555) 345-6790"
  },
  {
    id: "4",
    name: "Emily Davis",
    age: 38,
    gender: "Female",
    admissionDate: "2024-01-05",
    status: 'discharged',
    room: "Room 104",
    diagnosis: "Cannabis Use Disorder",
    assignedClinician: "Dr. Maria Gonzalez",
    lastVisit: "2024-01-14T15:30:00Z",
    phone: "(555) 456-7890",
    email: "emily.davis@email.com",
    emergencyContact: "Robert Davis (555) 456-7891"
  },
];

export default function ClinicianPatientsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clinicianFilter, setClinicianFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filteredPatients = MOCK_PATIENTS.filter((p) => 
      !q || 
      p.name.toLowerCase().includes(q) ||
      p.diagnosis.toLowerCase().includes(q) ||
      p.room.toLowerCase().includes(q) ||
      p.assignedClinician.toLowerCase().includes(q)
    );

    if (statusFilter !== "all") {
      filteredPatients = filteredPatients.filter(p => p.status === statusFilter);
    }

    if (clinicianFilter !== "all") {
      filteredPatients = filteredPatients.filter(p => p.assignedClinician === clinicianFilter);
    }

    return filteredPatients;
  }, [query, statusFilter, clinicianFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
      discharged: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <Badge className={`${config.bg} ${config.text} ${config.border} text-xs font-medium`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const uniqueClinicians = Array.from(new Set(MOCK_PATIENTS.map(p => p.assignedClinician)));

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
              <p className="text-xs text-slate-500">Patient management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {MOCK_PATIENTS.length} Patients
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

          <IconPill aria="Vitals" onClick={() => router.push("/clinician/vitals")}>
            <HeartPulse className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Patients" active onClick={() => router.push("/clinician/patients")}>
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
              placeholder="Search patients, diagnosis, room..."
              className="pl-10 h-10 rounded-full border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-32 rounded-full border-slate-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="discharged">Discharged</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clinicianFilter} onValueChange={setClinicianFilter}>
              <SelectTrigger className="h-10 w-40 rounded-full border-slate-300">
                <SelectValue placeholder="Clinician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinicians</SelectItem>
                {uniqueClinicians.map(clinician => (
                  <SelectItem key={clinician} value={clinician}>{clinician}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 rounded-full border-slate-300 hover:border-cyan-400 hover:bg-cyan-50">
              <Filter className="h-4 w-4 mr-2 text-cyan-600" />
              Filter
            </Button>
            <span className="text-sm text-slate-600 font-medium">
              {filtered.length} of {MOCK_PATIENTS.length} patients
            </span>
          </div>
        </div>

        {/* Patients List */}
        <div className="grid gap-4">
          {filtered.map((patient) => (
            <Card key={patient.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-100 to-blue-200 flex items-center justify-center text-cyan-700 font-semibold text-lg">
                      {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-lg">{patient.name}</div>
                      <div className="text-sm text-slate-500">
                        {patient.age} years old • {patient.gender} • {patient.room}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(patient.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Diagnosis</div>
                      <div className="font-medium text-slate-800">{patient.diagnosis}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Stethoscope className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Assigned Clinician</div>
                      <div className="font-medium text-slate-800">{patient.assignedClinician}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Admission Date</div>
                      <div className="font-medium text-slate-800">
                        {new Date(patient.admissionDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-500">Last Visit</div>
                      <div className="font-medium text-slate-800">{formatDate(patient.lastVisit)}</div>
                    </div>
                  </div>
                  {patient.nextAppointment && (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-slate-500" />
                      <div>
                        <div className="text-xs text-slate-500">Next Appointment</div>
                        <div className="font-medium text-slate-800">{formatDate(patient.nextAppointment)}</div>
                      </div>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <div>
                        <div className="text-xs text-slate-500">Phone</div>
                        <div className="font-medium text-slate-800">{patient.phone}</div>
                    </div>
                  </div>
                  )}
                </div>

                {patient.emergencyContact && (
                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <strong>Emergency Contact:</strong> {patient.emergencyContact}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {filtered.length === 0 && (
            <Card className="shadow-sm">
              <CardContent className="p-12 text-center text-slate-500">
                <div className="text-lg font-medium mb-2">No patients found</div>
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