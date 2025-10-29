"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock, 
  Loader2, 
  Play,
  Download,
  Eye,
  Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type VideoSubmission = {
  id: string;
  patient_id: string;
  patient_name?: string;
  title: string;
  description: string | null;
  type: string;
  status: "uploading" | "processing" | "completed" | "failed";
  video_url: string | null;
  size_mb: number | null;
  duration_seconds: number | null;
  submitted_at: string;
  processed_at: string | null;
};

export default function VideoSubmissionsList() {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch video submissions
      const { data: videosData, error: videosError } = await supabase
        .from("video_submissions")
        .select("id, patient_id, title, description, type, status, video_url, size_mb, duration_seconds, submitted_at, processed_at")
        .order("submitted_at", { ascending: false })
        .limit(100);

      if (videosError) {
        console.error("Error loading video submissions:", videosError);
        setSubmissions([]);
        return;
      }

      // Get unique patient IDs
      const patientIds = [...new Set((videosData || []).map(v => v.patient_id).filter(Boolean))];

      // Fetch patient names
      const { data: patientsData } = await supabase
        .from("patients")
        .select("user_id, full_name, first_name, last_name")
        .in("user_id", patientIds);

      const patientMap = new Map<string, string>();
      (patientsData || []).forEach(p => {
        const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown Patient";
        patientMap.set(p.user_id, name);
      });

      // Combine video submissions with patient names
      const submissionsWithNames: VideoSubmission[] = (videosData || []).map(v => ({
        ...v,
        patient_name: patientMap.get(v.patient_id) || "Unknown Patient"
      }));

      setSubmissions(submissionsWithNames);
    } catch (error) {
      console.error("Error loading video submissions:", error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();

    // Real-time subscription
    const channel = supabase
      .channel("staff-video-submissions-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "video_submissions",
        },
        () => {
          loadSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title?.toLowerCase().includes(lowerSearch) ||
          s.patient_name?.toLowerCase().includes(lowerSearch) ||
          s.description?.toLowerCase().includes(lowerSearch) ||
          s.type?.toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  }, [submissions, statusFilter, typeFilter, searchTerm]);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      completed: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
      processing: { label: "Processing", className: "bg-blue-100 text-blue-700 border-blue-200" },
      uploading: { label: "Uploading", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
      failed: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
    };
    const variant = variants[status] || variants.uploading;
    return (
      <Badge className={`${variant.className} border text-xs font-medium px-2 py-1`}>
        {variant.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "daily-checkin": "Daily Check-in",
      "medication": "Medication",
      "therapy-session": "Therapy Session",
      "progress-update": "Progress Update",
    };
    return labels[type] || type.replace("-", " ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Patient Video Submissions</h2>
          <p className="text-slate-600 mt-1">Review patient video recordings and submissions</p>
        </div>
        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
          <Activity className="h-3 w-3 mr-1" />
          Real-time Updates
        </Badge>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="flex-row items-center justify-between space-y-0 p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3 flex-1">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by patient, title, description, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="uploading">Uploading</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="daily-checkin">Daily Check-in</SelectItem>
                <SelectItem value="medication">Medication</SelectItem>
                <SelectItem value="therapy-session">Therapy Session</SelectItem>
                <SelectItem value="progress-update">Progress Update</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-500" />
              <p className="text-gray-600">Loading video submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Video Submissions Found</h3>
              <p className="text-gray-600">
                {submissions.length === 0
                  ? "No video submissions have been submitted yet."
                  : "No video submissions match your filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSubmissions.map((submission) => (
                <div key={submission.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        <Video className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg text-gray-900">
                            {submission.title || "Untitled Video"}
                          </h4>
                          {getStatusBadge(submission.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{submission.patient_name || "Unknown Patient"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(submission.submitted_at)}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(submission.type)}
                          </Badge>
                          {submission.duration_seconds && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>{formatDuration(submission.duration_seconds)}</span>
                            </div>
                          )}
                          {submission.size_mb && (
                            <span className="text-xs">({submission.size_mb.toFixed(2)} MB)</span>
                          )}
                        </div>
                        {submission.description && (
                          <p className="text-sm text-gray-600 mb-2">{submission.description}</p>
                        )}
                        {submission.video_url && (
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(submission.video_url!, "_blank")}
                              className="text-indigo-600 hover:text-indigo-700"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Watch Video
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = submission.video_url!;
                                link.download = `${submission.title || "video"}.mp4`;
                                link.click();
                              }}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


