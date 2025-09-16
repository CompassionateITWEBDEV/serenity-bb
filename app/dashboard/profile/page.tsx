"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Phone, Mail, MapPin, Heart, Activity, Award, Clock, Target, TrendingUp, Edit } from "lucide-react"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)

  const patientInfo = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@email.com",
    phone: "+1 (555) 123-4567",
    dateOfBirth: "January 15, 1990",
    address: "123 Recovery Lane, Wellness City, WC 12345",
    emergencyContact: "Jane Doe - (555) 987-6543",
    admissionDate: "March 1, 2024",
    treatmentType: "Outpatient",
    primaryPhysician: "Dr. Sarah Smith",
    counselor: "Mike Wilson",
  }

  const achievements = [
    { id: 1, title: "30 Days Clean", description: "Completed 30 consecutive days", icon: "🏆", date: "2024-04-01" },
    {
      id: 2,
      title: "Mindfulness Master",
      description: "Completed 50 meditation sessions",
      icon: "🧘",
      date: "2024-03-15",
    },
    {
      id: 3,
      title: "Perfect Attendance",
      description: "Attended all scheduled appointments",
      icon: "📅",
      date: "2024-03-01",
    },
    { id: 4, title: "Peer Support", description: "Helped 5 fellow patients", icon: "🤝", date: "2024-02-20" },
  ]

  const healthMetrics = [
    { label: "Overall Progress", value: 78, color: "bg-green-500" },
    { label: "Treatment Adherence", value: 92, color: "bg-blue-500" },
    { label: "Wellness Score", value: 85, color: "bg-purple-500" },
    { label: "Goal Completion", value: 67, color: "bg-orange-500" },
  ]

  const recentActivity = [
    { id: 1, activity: "Completed mindfulness session", time: "2 hours ago", type: "wellness" },
    { id: 2, activity: "Attended group therapy", time: "1 day ago", type: "therapy" },
    { id: 3, activity: "Medication check-in", time: "2 days ago", type: "medical" },
    { id: 4, activity: "Progress assessment", time: "3 days ago", type: "assessment" },
  ]

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">View and manage your personal information and progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/patient-avatar.png" />
                  <AvatarFallback className="text-2xl">
                    {patientInfo.firstName[0]}
                    {patientInfo.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">
                {patientInfo.firstName} {patientInfo.lastName}
              </CardTitle>
              <CardDescription>Patient ID: #PAT-2024-001</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">{patientInfo.treatmentType}</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patientInfo.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patientInfo.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Born {patientInfo.dateOfBirth}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patientInfo.address}</span>
              </div>
              <Button className="w-full mt-4" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardContent>
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
          <Tabs defaultValue="overview" className="space-y-6">
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
                          <p className="text-sm font-medium">{patientInfo.primaryPhysician}</p>
                          <p className="text-xs text-gray-600">Primary Physician</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/counselor.png" />
                          <AvatarFallback>MW</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{patientInfo.counselor}</p>
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
                          <span>Admission Date:</span>
                          <span>{patientInfo.admissionDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Treatment Type:</span>
                          <span>{patientInfo.treatmentType}</span>
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
                          <span>{patientInfo.emergencyContact}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Relationship:</span>
                          <span>Spouse</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Current Medications</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Methadone</p>
                          <p className="text-sm text-gray-600">40mg daily - Morning</p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Multivitamin</p>
                          <p className="text-sm text-gray-600">1 tablet daily - Morning</p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
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
  )
}
