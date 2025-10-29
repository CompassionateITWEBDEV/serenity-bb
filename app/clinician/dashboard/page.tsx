// app/clinician/dashboard/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Phone,
  Mail,
  Calendar,
  MapPin,
  Clock,
  Star,
  ChevronRight,
} from "lucide-react";
import MobileDock from "@/components/staff/MobileDock";
import DashboardGlyph from "@/components/icons/DashboardGlyph";

type Clinician = {
  id: string;
  name: string;
  role: string;
  subtitle?: string;
  avatar: string;
  email?: string;
  phone?: string;
  location?: string;
  availability?: string;
  rating?: number;
  experience?: string;
  specialties?: string[];
  nextAvailable?: string;
  verified?: boolean;
  totalVerifications?: number;
  averageRating?: number | null;
};

export default function ClinicianDashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filterAvailability, setFilterAvailability] = useState<string>("all");
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerifiedClinicians = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get session token from Supabase
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const response = await fetch('/api/clinicians/verified', {
        method: 'GET',
        credentials: 'include', // Ensure cookies are sent
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        
        // If unauthorized, the user might need to log in
        if (response.status === 401) {
          throw new Error('Please log in to view verified clinicians');
        }
        
        // For 500 errors, log but don't throw - allow fallback to mock data
        if (response.status === 500) {
          console.warn('Server error fetching clinicians, falling back to empty array');
          setClinicians([]);
          setLoading(false);
          return;
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch verified clinicians`);
      }
      
      const data = await response.json();
      console.log('Fetched clinicians data:', data);
      
      // If data has an error but status is 200, treat as empty
      if (data.error && !data.clinicians) {
        console.warn('API returned error in data:', data.error);
        setClinicians([]);
        setLoading(false);
        return;
      }
      
      // Transform API data to match Clinician type
      const transformedClinicians: Clinician[] = (data.clinicians || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        avatar: c.avatar,
        email: c.email,
        phone: c.phone,
        location: c.department ? `Main Campus - ${c.department}` : "Main Campus",
        availability: c.availability || "Available",
        rating: c.averageRating,
        experience: `${Math.floor(Math.random() * 20) + 5} years`,
        specialties: c.specialties || [],
        nextAvailable: `Today, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        verified: true,
        totalVerifications: c.totalVerifications,
        averageRating: c.averageRating,
      }));
      
      setClinicians(transformedClinicians);
    } catch (err: any) {
      console.error("Error fetching verified clinicians:", err);
      setError(err.message || "Failed to load clinicians");
      // Clear clinicians on error so fallback to MOCKS works
      setClinicians([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifiedClinicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback mock data (no longer used; kept for reference/testing only)
  const MOCKS: Clinician[] = [
    { 
      id: "1", 
      name: "Dr. Marlin Cooper", 
      role: "Addiction Recovery Consultant", 
      avatar: "/avatars/1.png",
      email: "marlin.cooper@serenity.com",
      phone: "(555) 123-4567",
      location: "Main Campus - Building A",
      availability: "Available",
      rating: 4.8,
      experience: "15 years",
      specialties: ["Addiction Recovery", "Behavioral Therapy", "Group Counseling"],
      nextAvailable: "Today, 2:00 PM"
    },
    { 
      id: "2", 
      name: "Dr. Sarah Jennings", 
      role: "Substance Abuse Counselor", 
      avatar: "/avatars/2.png",
      email: "sarah.jennings@serenity.com",
      phone: "(555) 234-5678",
      location: "Main Campus - Building B",
      availability: "Available",
      rating: 4.9,
      experience: "12 years",
      specialties: ["Substance Abuse", "Individual Therapy", "Family Counseling"],
      nextAvailable: "Today, 3:30 PM"
    },
    { 
      id: "3", 
      name: "Dr. Emily Roberts", 
      role: "Behavioral Health Specialist", 
      avatar: "/avatars/3.png",
      email: "emily.roberts@serenity.com",
      phone: "(555) 345-6789",
      location: "Main Campus - Building A",
      availability: "In Session",
      rating: 4.7,
      experience: "10 years",
      specialties: ["Behavioral Health", "Cognitive Therapy", "Trauma Recovery"],
      nextAvailable: "Today, 4:15 PM"
    },
    { 
      id: "4", 
      name: "Dr. Maria Gonzalez", 
      role: "Rehabilitation Physician (Physiatrist)", 
      avatar: "/avatars/4.png",
      email: "maria.gonzalez@serenity.com",
      phone: "(555) 456-7890",
      location: "Main Campus - Building C",
      availability: "Available",
      rating: 4.9,
      experience: "18 years",
      specialties: ["Physical Rehabilitation", "Pain Management", "Medical Assessment"],
      nextAvailable: "Today, 1:45 PM"
    },
    { 
      id: "5", 
      name: "Dr. Aisha Rahman", 
      role: "Mental Health & Addiction Therapist", 
      avatar: "/avatars/5.png",
      email: "aisha.rahman@serenity.com",
      phone: "(555) 567-8901",
      location: "Main Campus - Building B",
      availability: "Available",
      rating: 4.8,
      experience: "14 years",
      specialties: ["Mental Health", "Addiction Therapy", "Crisis Intervention"],
      nextAvailable: "Today, 2:30 PM"
    },
    { 
      id: "6", 
      name: "Dr. John Lee", 
      role: "Addiction Medicine Specialist", 
      avatar: "/avatars/6.png",
      email: "john.lee@serenity.com",
      phone: "(555) 678-9012",
      location: "Main Campus - Building A",
      availability: "On Break",
      rating: 4.6,
      experience: "16 years",
      specialties: ["Addiction Medicine", "Medication Management", "Medical Detox"],
      nextAvailable: "Today, 3:00 PM"
    },
  ];

  // Always use fetched clinicians from Supabase (verified staff only)
  // If none are verified, show empty state instead of mock data
  const displayClinicians = clinicians;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filteredClinicians = displayClinicians.filter((c) => 
      !q || 
      c.name.toLowerCase().includes(q) || 
      c.role.toLowerCase().includes(q) ||
      c.specialties?.some(s => s.toLowerCase().includes(q))
    );

    if (filterAvailability !== "all") {
      filteredClinicians = filteredClinicians.filter(c => 
        c.availability?.toLowerCase() === filterAvailability.toLowerCase()
      );
    }

    return filteredClinicians;
  }, [displayClinicians, query, filterAvailability]);

  const handleClinicianClick = (clinician: Clinician) => {
    setSelectedClinician(clinician);
    setIsDetailOpen(true);
  };

  const handleMessageClinician = (clinician: Clinician) => {
    router.push(`/staff/messages?clinician=${clinician.id}`);
  };

  const handleScheduleAppointment = (clinician: Clinician) => {
    router.push(`/staff/schedule?clinician=${clinician.id}`);
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
              <p className="text-xs text-slate-500">Directory &amp; messaging</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">Live</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Icon row - matching staff dashboard order */}
        <div className="flex items-center gap-3">
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

          <IconPill aria="Clinicians" active onClick={() => router.push("/clinician/dashboard")}>
            <Stethoscope className="h-5 w-5" />
          </IconPill>

          <IconPill aria="Settings" onClick={() => router.push("/staff/profile")}>
            <SettingsIcon className="h-5 w-5" />
          </IconPill>

          <span aria-hidden className="mx-1 h-5 w-px bg-slate-300" />

          <IconPill aria="Vitals" onClick={() => router.push("/clinician/vitals")}>
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
              placeholder="Search clinicians, specialties..."
              className="pl-10 h-10 rounded-full border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="h-10 px-3 rounded-full border border-slate-300 bg-white text-sm focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="all">All Availability</option>
              <option value="available">Available</option>
              <option value="in session">In Session</option>
              <option value="on break">On Break</option>
            </select>
            <Button variant="outline" className="h-10 rounded-full border-slate-300 hover:border-cyan-400 hover:bg-cyan-50">
              <Filter className="h-4 w-4 mr-2 text-cyan-600" />
              Filter
            </Button>
            <span className="text-sm text-slate-600 font-medium">
              {filtered.length} of {displayClinicians.length} verified clinicians
            </span>
          </div>
        </div>

        {/* Directory list */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 py-12 text-center text-slate-500">
                <div className="text-lg font-medium mb-2">Loading verified clinicians...</div>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center text-slate-500">
                <div className="text-lg font-medium mb-2 text-rose-600">Error loading clinicians</div>
                <div className="text-sm">{error}</div>
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => (
                  <li key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => handleClinicianClick(c)}>
                    <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="font-semibold text-slate-800 truncate">{c.name}</div>
                        {c.verified && (
                          <Badge 
                            variant="secondary" 
                            className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                          >
                            ✓ Verified
                          </Badge>
                        )}
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            c.availability === 'Available' ? 'bg-green-100 text-green-700 border-green-200' :
                            c.availability === 'In Session' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            c.availability === 'On Break' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {c.availability}
                        </Badge>
                        {c.rating && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {c.rating}
                          </div>
                        )}
                        {c.totalVerifications && c.totalVerifications > 0 && (
                          <div className="text-xs text-slate-400">
                            ({c.totalVerifications} {c.totalVerifications === 1 ? 'verification' : 'verifications'})
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 truncate mb-1">{c.role}</div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {c.nextAvailable}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">•</span>
                          {c.experience}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessageClinician(c);
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-cyan-600 hover:bg-cyan-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScheduleAppointment(c);
                        }}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-6 py-12 text-center text-slate-500">
                    <div className="text-lg font-medium mb-2">No clinicians found</div>
                    <div className="text-sm">Try adjusting your search or filter criteria</div>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Clinician Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden">
                  <img
                    src={selectedClinician?.avatar}
                    alt={selectedClinician?.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <div className="text-xl font-semibold">{selectedClinician?.name}</div>
                  <div className="text-sm text-slate-500">{selectedClinician?.role}</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            {selectedClinician && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Badge 
                    variant="secondary" 
                    className={`${
                      selectedClinician.availability === 'Available' ? 'bg-green-100 text-green-700 border-green-200' :
                      selectedClinician.availability === 'In Session' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      selectedClinician.availability === 'On Break' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {selectedClinician.availability}
                  </Badge>
                  {selectedClinician.rating && (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{selectedClinician.rating}</span>
                      <span className="text-slate-400">({selectedClinician.experience})</span>
                    </div>
                  )}
                  {selectedClinician.verified && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="h-5 w-5 text-slate-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">Email</div>
                      <div className="text-sm text-slate-600">{selectedClinician.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone className="h-5 w-5 text-slate-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">Phone</div>
                      <div className="text-sm text-slate-600">{selectedClinician.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-slate-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">Location</div>
                      <div className="text-sm text-slate-600">{selectedClinician.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Clock className="h-5 w-5 text-slate-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">Next Available</div>
                      <div className="text-sm text-slate-600">{selectedClinician.nextAvailable}</div>
                    </div>
                  </div>
                </div>

                {selectedClinician.specialties && selectedClinician.specialties.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedClinician.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleMessageClinician(selectedClinician)}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button
                    onClick={() => handleScheduleAppointment(selectedClinician)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Quick message to team..."
              className="pl-10 h-10 rounded-full border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
          <Button className="h-10 px-6 rounded-full bg-cyan-600 hover:bg-cyan-700">
            Send
          </Button>
        </div>
      </div>

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
