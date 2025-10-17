"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RealTimeVideoSystem from "@/components/dashboard/real-time-video-system";
import {
  Video,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Eye,
  Trash2,
  PlusCircle,
  Edit2,
  X,
  Copy,
  Info,
  RotateCcw,
  ArrowLeft,
  Camera,
  Mic,
  MicOff,
  CameraOff,
  Settings,
  Download,
  Share,
  Calendar,
  User,
  Activity,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function RecordingPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "recording" | "submissions" | "analytics">("recording");
  const [recordingStats, setRecordingStats] = useState({
    totalRecordings: 0,
    totalDuration: 0,
    thisWeek: 0,
    lastRecording: null as string | null,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading recording dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                Welcome back, {patient.firstName}!
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-gray-900">Video Recording</h1>
            <p className="text-gray-600 mt-2">Record and submit videos for your recovery journey</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{recordingStats.totalRecordings}</h3>
                  <p className="text-sm text-gray-600 font-medium">Total Recordings</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {Math.floor(recordingStats.totalDuration / 60)}m {recordingStats.totalDuration % 60}s
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">Total Duration</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{recordingStats.thisWeek}</h3>
                  <p className="text-sm text-gray-600 font-medium">This Week</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {recordingStats.lastRecording ? "Recent" : "None"}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">Last Recording</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-xl">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="recording" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Recording
            </TabsTrigger>
            <TabsTrigger value="submissions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Submissions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-blue-600" />
                    Quick Start
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Video className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Start Recording</h4>
                        <p className="text-sm text-gray-600">Begin a new video recording session</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Upload className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Upload File</h4>
                        <p className="text-sm text-gray-600">Upload an existing video file</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Eye className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">View Submissions</h4>
                        <p className="text-sm text-gray-600">Review your previous recordings</p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => setActiveTab("recording")}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Start Recording Now
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No recent recordings</p>
                      <p className="text-sm text-gray-400 mt-2">Start recording to see your activity here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recording Tab */}
          <TabsContent value="recording" className="space-y-6">
            <RealTimeVideoSystem />
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  Video Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Yet</h3>
                  <p className="text-gray-600 mb-6">Start recording or upload videos to see them here</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setActiveTab("recording")}>
                      <Video className="h-4 w-4 mr-2" />
                      Start Recording
                    </Button>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Recording Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No data available yet</p>
                    <p className="text-sm text-gray-400 mt-2">Analytics will appear as you record more videos</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    Progress Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <h4 className="font-medium text-green-900">Consistency</h4>
                          <p className="text-sm text-green-700">Keep recording regularly</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Good</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-blue-900">Duration</h4>
                          <p className="text-sm text-blue-700">Average recording length</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">2-5 min</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}



