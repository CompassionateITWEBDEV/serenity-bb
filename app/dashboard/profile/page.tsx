// /app/dashboard/profile/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeProfile } from "@/hooks/use-realtime-profile";
import { RealtimeStatusIndicator } from "@/components/realtime-status-indicator";
import {
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  Activity,
  Award,
  Clock,
  Target,
  TrendingUp,
  Edit,
  Save,
  X,
  CheckCircle,
} from "lucide-react";

type UpdateStatus = { type: "success" | "error"; message: string } | null;

export default function ProfilePage() {
  const { patient, isAuthenticated } = useAuth();
  const { profileData, updateProfile, isOnline, isRealtimeEnabled } = useRealtimeProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "medical" | "achievements" | "activity">("overview");

  const currentPatient = profileData || patient;

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: "",
  });

  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Derived flags
  const isValid =
    editForm.firstName.trim().length > 0 &&
    editForm.lastName.trim().length > 0 &&
    editForm.phoneNumber.trim().length >= 3;

  const isDirty = useMemo(() => {
    if (!currentPatient) return false;
    return (
      editForm.firstName !== (currentPatient.firstName || "") ||
      editForm.lastName !== (currentPatient.lastName || "") ||
      editForm.phoneNumber !== (currentPatient.phoneNumber || "") ||
      (editForm.dateOfBirth || "") !== (currentPatient.dateOfBirth || "")
    );
  }, [editForm, currentPatient]);

  if (!isAuthenticated || !currentPatient) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  function handleEditStart() {
    setEditForm({
      firstName: currentPatient.firstName || "",
      lastName: currentPatient.lastName || "",
      phoneNumber: currentPatient.phoneNumber || "",
      dateOfBirth: currentPatient.dateOfBirth || "",
    });
    setIsEditing(true);
    setActiveTab("medical");
    setUpdateStatus(null);
  }

  useEffect(() => {
    if (isEditing && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [isEditing]);

  async function handleSaveProfile() {
    if (!isDirty || !isValid) return;
    const res = await updateProfile(editForm);
    if (res.success) {
      setUpdateStatus({ type: "success", message: "Profile updated successfully!" });
      setIsEditing(false);
      const t = setTimeout(() => setUpdateStatus(null), 2500);
      return () => clearTimeout(t);
    } else {
      setUpdateStatus({ type: "error", message: res.error || "Failed to update profile." });
    }
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setUpdateStatus(null);
  }

  const achievements = [
    { id: 1, title: "30 Days Clean", description: "Completed 30 consecutive days", icon: "🏆", date: "2024-04-01" },
    { id: 2, title: "Mindfulness Master", description: "Completed 50 meditation sessions", icon: "🧘", date: "2024-03-15" },
    { id: 3, title: "Perfect Attendance", description: "Attended all scheduled appointments", icon: "📅", date: "2024-03-01" },
    { id: 4, title: "Peer Support", description: "Helped 5 fellow patients", icon: "🤝", date: "2024-02-20" },
  ];

  const healthMetrics = [
    { label: "Overall Progress", value: 78, color: "bg-green-500" },
    { label: "Treatment Adherence", value: 92, color: "bg-blue-500" },
    { label: "Wellness Score", value: 85, color: "bg-purple-500" },
    { label: "Goal Completion", value: 67, color: "bg-orange-500" },
  ];

  const recentActivity = [
    { id: 1, activity: "Completed mindfulness session", time: "2 hours ago", type: "wellness" },
    { id: 2, activity: "Attended group therapy", time: "1 day ago", type: "therapy" },
    { id: 3, activity: "Medication check-in", time: "2 days ago", type: "medical" },
    { id: 4, activity: "Progress assessment", time: "3 days ago", type: "assessment" },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">View and manage your personal information and progress</p>
        </div>
        <RealtimeStatusIndicator isOnline={isOnline} isRealtimeEnabled={isRealtimeEnabled} />
      </div>

      {updateStatus && (
        <Alert className={`mb-6 ${updateStatus.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          {updateStatus.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
          <AlertDescription className={updateStatus.type === "success" ? "text-green-800" : "text-red-800"}>
            {updateStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={currentPatient.avatar || "/patient-avatar.png"} />
                  <AvatarFallback className="text-2xl">
                    {(currentPatient.firstName || "?")[0]}
                    {(currentPatient.lastName || "?")[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">
                {currentPatient.firstName} {currentPatient.lastName}
              </CardTitle>
              <CardDescription>Patient ID: #{currentPatient.id}</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">{currentPatient.treatmentPlan || "Outpatient"}</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{currentPatient.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{currentPatient.phoneNumber || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Born {currentPatient.dateOfBirth || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Emergency: {currentPatient.emergencyContact?.name || "—"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      ref={firstInputRef}
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-2">
              {!isEditing ? (
                <Button className="w-full" onClick={handleEditStart}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button className="flex-1" onClick={handleSaveProfile} disabled={!isValid || !isDirty}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>

          {/* Health Metrics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Health Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{metric.label}</span>
                    <span>{metric.value}%</span>
                  </div>
                  <Progress value={metric.value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Treatment Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Complete 90-day program</span>
                        <Badge variant="secondary">In Progress</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Daily meditation practice</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Weekly therapy sessions</span>
                        <Badge variant="secondary">On Track</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Progress Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Days in treatment</span>
                        <span className="font-medium">45 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Sessions completed</span>
                        <span className="font-medium">32/40</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Goals achieved</span>
                        <span className="font-medium">8/12</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Care Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/caring-doctor.png" />
                          <AvatarFallback>DS</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Dr. Sarah Smith</p>
                          <p className="text-xs text-gray-600">Primary Physician</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/counselor.png" />
                          <AvatarFallback>MW</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Mike Wilson</p>
                          <p className="text-xs text-gray-600">Counselor</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Next Appointments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium">Group Therapy</p>
                          <p className="text-xs text-gray-600">Tomorrow, 2:00 PM</p>
                        </div>
                        <Badge variant="outline">Scheduled</Badge>
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium">Dr. Smith Check-in</p>
                          <p className="text-xs text-gray-600">Friday, 10:00 AM</p>
                        </div>
                        <Badge variant="outline">Scheduled</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="medical">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                  <CardDescription>Your medical history and current treatment details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Treatment Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Join Date:</span>
                          <span>{currentPatient.joinDate || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Treatment Plan:</span>
                          <span>{currentPatient.treatmentPlan || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Program Duration:</span>
                          <span>90 days</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Emergency Contact</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Contact:</span>
                          <span>{currentPatient.emergencyContact?.name || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phone:</span>
                          <span>{currentPatient.emergencyContact?.phone || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Relationship:</span>
                          <span>{currentPatient.emergencyContact?.relationship || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Achievements & Milestones
                  </CardTitle>
                  <CardDescription>Celebrate your progress and accomplishments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{achievement.title}</h4>
                          <p className="text-sm text-gray-600">{achievement.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Earned on {achievement.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent interactions and progress updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            item.type === "wellness"
                              ? "bg-green-500"
                              : item.type === "therapy"
                              ? "bg-blue-500"
                              : item.type === "medical"
                              ? "bg-red-500"
                              : "bg-purple-500"
                          }`}
                        ></div>
                        <div className="flex-1">
                          <p className="font-medium">{item.activity}</p>
                          <p className="text-sm text-gray-600">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
