// ./components/dashboard/submission-history.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, Clock, Pill, Activity, Heart, Brain, Plus, CheckCircle, AlertCircle, 
  Play, Trash2, Save, Search, Filter, MoreHorizontal, Edit3, Eye, 
  TrendingUp, BarChart3, Calendar as CalendarIcon, X, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type EntryType = "medication" | "activity" | "mood" | "symptom" | "vitals" | "video";
type EntryStatus = "completed" | "missed" | "partial";

type SubmissionRow = {
  id: string;
  user_id: string;
  type: EntryType;
  title: string;
  description: string | null;
  status: EntryStatus;
  value: string | null;
  notes: string | null;
  occurred_at: string;   // ISO
  created_at: string;
  updated_at: string;
};

type VideoRow = {
  id: string;
  patient_id: string | null;
  title: string;
  description: string | null;
  type: "daily-checkin" | "medication" | "therapy-session" | "progress-update";
  status: "uploading" | "processing" | "completed" | "failed";
  video_url: string | null;
  size_mb: number | null;
  duration_seconds: number | null;
  submitted_at: string;
};

type SubmissionEntry = {
  id: string;
  type: EntryType;
  title: string;
  description: string;
  timestamp: string;
  status: EntryStatus;
  value?: string;
  notes?: string;
  videoUrl?: string | null;
  videoStatus?: "uploading" | "processing" | "completed" | "failed";
  _source?: "db" | "video";
};

export function SubmissionHistory() {
  const [uid, setUid] = useState<string | null>(null);
  const [entries, setEntries] = useState<SubmissionEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<EntryType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<EntryStatus | "all">("all");
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [newEntry, setNewEntry] = useState<{ type: EntryType; title: string; description: string; value: string; notes: string }>({
    type: "medication",
    title: "",
    description: "",
    value: "",
    notes: "",
  });

  // session + initial load
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) return;
      setUid(user.id);

      await Promise.all([loadSubmissions(user.id), loadVideos(user.id)]);
      } catch (error) {
        console.error("Error loading submission history:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // realtime
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`submissions:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `user_id=eq.${uid}` }, async () => {
        await loadSubmissions(uid);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "video_submissions", filter: `patient_id=eq.${uid}` }, async () => {
        await loadVideos(uid);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  async function loadSubmissions(userId: string) {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false });
    if (error) { console.warn("submissions load error", error.message); return; }
    const mapped: SubmissionEntry[] = (data ?? []).map((r: SubmissionRow) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description ?? "",
      timestamp: r.occurred_at,
      status: r.status,
      value: r.value ?? undefined,
      notes: r.notes ?? undefined,
      _source: "db",
    }));
    setEntries((prev) => mergeEntriesWith(prev, mapped, (e) => e._source !== "db"));
  }

  async function loadVideos(userId: string) {
    const { data, error } = await supabase
      .from("video_submissions")
      .select("id, patient_id, title, description, type, status, video_url, size_mb, duration_seconds, submitted_at")
      .eq("patient_id", userId)
      .order("submitted_at", { ascending: false });
    if (error) { console.warn("video_submissions load error", error.message); return; }

    const vids: SubmissionEntry[] = (data ?? []).map((r: VideoRow) => ({
      id: `video-${r.id}`,
      type: "video",
      title: r.title || "Video submission",
      description: r.description || r.type.replace("-", " "),
      timestamp: r.submitted_at,
      status: r.status === "failed" ? "partial" : r.status === "completed" ? "completed" : "partial",
      value:
        (r.duration_seconds != null ? `${r.duration_seconds}s` : "") +
        (r.size_mb != null ? (r.duration_seconds != null ? " • " : "") + `${r.size_mb} MB` : ""),
      notes: r.status === "processing" ? "Processing…" : undefined,
      videoUrl: r.video_url,
      videoStatus: r.status,
      _source: "video",
    }));

    setEntries((prev) => mergeEntriesWith(prev, vids, (e) => e._source !== "video"));
  }

  function mergeEntriesWith(current: SubmissionEntry[], incoming: SubmissionEntry[], keepPredicate: (e: SubmissionEntry) => boolean) {
    const kept = current.filter(keepPredicate);
    const merged = [...kept, ...incoming];
    return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // CRUD
  async function addEntry() {
    if (!uid || !newEntry.title.trim() || !newEntry.description.trim()) {
      alert("Please fill in both title and description fields.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: submissionData, error } = await supabase.from("submissions").insert({
      user_id: uid,
      type: newEntry.type,
        title: newEntry.title.trim(),
        description: newEntry.description.trim(),
      status: "completed",
        value: newEntry.value?.trim() || null,
        notes: newEntry.notes?.trim() || null,
      occurred_at: new Date().toISOString(),
      }).select().single();
      
      if (error) {
        console.error("Error adding entry:", error);
        alert(`Failed to add entry: ${error.message}`);
        return;
      }

      // Get patient name for notification
      const { data: patientData } = await supabase
        .from("patients")
        .select("first_name, last_name")
        .eq("user_id", uid)
        .single();

      const patientName = patientData 
        ? `${patientData.first_name} ${patientData.last_name}`.trim()
        : "Patient";

      // Create notification for staff via API
      try {
        const notificationResponse = await fetch('/api/notifications/submission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submissionId: submissionData.id,
            submissionType: newEntry.type,
            patientName: patientName
          })
        });
        
        if (notificationResponse.ok) {
          console.log("Staff notification created for submission:", submissionData.id);
        } else {
          console.error("Failed to create staff notification");
        }
      } catch (notificationError) {
        console.error("Error creating staff notification:", notificationError);
        // Don't fail the submission if notification fails
      }
      
      // Reset form and close
    setNewEntry({ type: "medication", title: "", description: "", value: "", notes: "" });
    setShowAddForm(false);
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateEntry(id: string, patch: Partial<SubmissionRow>) {
    if (!uid) return;
    const { error } = await supabase.from("submissions").update({ ...patch }).eq("id", id).eq("user_id", uid);
    if (error) alert(error.message);
  }

  async function deleteEntry(id: string) {
    if (!uid) return;
    const { error } = await supabase.from("submissions").delete().eq("id", id).eq("user_id", uid);
    if (error) alert(error.message);
  }

  // UI helpers
  const getTypeIcon = (type: EntryType) =>
    type === "medication" ? <Pill className="h-4 w-4" /> :
    type === "activity" ? <Activity className="h-4 w-4" /> :
    type === "mood" ? <Brain className="h-4 w-4" /> :
    type === "symptom" ? <AlertCircle className="h-4 w-4" /> :
    type === "vitals" ? <Heart className="h-4 w-4" /> :
    <Play className="h-4 w-4" />;

  const typeColor = (type: EntryType) =>
    type === "medication" ? "bg-blue-100 text-blue-800" :
    type === "activity" ? "bg-green-100 text-green-800" :
    type === "mood" ? "bg-purple-100 text-purple-800" :
    type === "symptom" ? "bg-red-100 text-red-800" :
    type === "vitals" ? "bg-orange-100 text-orange-800" :
    "bg-cyan-100 text-cyan-800";

  const statusBadge = (s: EntryStatus) =>
    s === "completed" ? "bg-green-100 text-green-800" :
    s === "missed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";

  // Filter and search functionality
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery || 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === "all" || entry.type === filterType;
      const matchesStatus = filterStatus === "all" || entry.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [entries, searchQuery, filterType, filterStatus]);

  const groupedEntries = useMemo(() => {
    return filteredEntries.reduce((acc, e) => {
      const date = new Date(e.timestamp).toLocaleDateString();
      (acc[date] ||= []).push(e);
      return acc;
    }, {} as Record<string, SubmissionEntry[]>);
  }, [filteredEntries]);

  // Bulk actions
  const handleSelectEntry = (id: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEntries(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!uid || selectedEntries.size === 0) return;
    
    const { error } = await supabase
      .from("submissions")
      .delete()
      .in("id", Array.from(selectedEntries))
      .eq("user_id", uid);
    
    if (error) {
      alert(`Failed to delete entries: ${error.message}`);
    } else {
      setSelectedEntries(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Entries</p>
                <p className="text-2xl font-bold text-blue-900">{entries.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {entries.filter(e => e.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">This Week</p>
                <p className="text-2xl font-bold text-orange-900">
                  {entries.filter(e => {
                    const entryDate = new Date(e.timestamp);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return entryDate >= weekAgo;
                  }).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
          <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Medications</p>
                <p className="text-2xl font-bold text-purple-900">
                  {entries.filter(e => e.type === "medication").length}
                </p>
              </div>
              <Pill className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Submission History</CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Track medication, activities, mood, health metrics, and videos
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </CardHeader>

        {/* Enhanced Add Form */}
        {showAddForm && (
          <CardContent className="space-y-6 border-t bg-gradient-to-r from-blue-50/50 to-purple-50/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-slate-800">Add New Entry</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Entry Type
                </label>
                <Select value={newEntry.type} onValueChange={(v: EntryType) => setNewEntry({ ...newEntry, type: v })}>
                  <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-blue-500" />
                        Medication
                      </div>
                    </SelectItem>
                    <SelectItem value="activity">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        Activity
                      </div>
                    </SelectItem>
                    <SelectItem value="mood">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-500" />
                        Mood
                      </div>
                    </SelectItem>
                    <SelectItem value="symptom">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Symptom
                      </div>
                    </SelectItem>
                    <SelectItem value="vitals">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-orange-500" />
                        Vitals
                      </div>
                    </SelectItem>
                    <SelectItem value="video" disabled>
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-cyan-500" />
                        Video (readonly)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Title</label>
                <Input 
                  value={newEntry.title} 
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} 
                  placeholder="e.g., Methadone 40mg"
                  className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <Input 
                value={newEntry.description} 
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} 
                placeholder="e.g., Morning dose"
                className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Value (optional)</label>
              <Input 
                value={newEntry.value} 
                onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })} 
                placeholder="e.g., 7/10, 120/80 mmHg"
                className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Notes</label>
              <Textarea 
                value={newEntry.notes} 
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })} 
                placeholder="Additional notes or observations" 
                rows={4}
                className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={addEntry} 
                disabled={isSubmitting || !newEntry.title.trim() || !newEntry.description.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Entry
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
                className="border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Search and Filter Controls */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              <Select value={filterType} onValueChange={(v: EntryType | "all") => setFilterType(v)}>
                <SelectTrigger className="w-40 h-12 border-2 border-slate-200 focus:border-blue-500">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="mood">Mood</SelectItem>
                  <SelectItem value="symptom">Symptom</SelectItem>
                  <SelectItem value="vitals">Vitals</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={(v: EntryStatus | "all") => setFilterStatus(v)}>
                <SelectTrigger className="w-40 h-12 border-2 border-slate-200 focus:border-blue-500">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                className="h-12 px-4 border-2 border-slate-200 hover:border-slate-300"
              >
                {viewMode === "list" ? <CalendarIcon className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedEntries.size > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  {selectedEntries.size} entry{selectedEntries.size !== 1 ? 'ies' : 'y'} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEntries(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-slate-600">Loading submission history...</p>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!isLoading && filteredEntries.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No entries found</h3>
            <p className="text-slate-600 mb-4">
              {searchQuery || filterType !== "all" || filterStatus !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "Start by adding your first entry using the button above."
              }
            </p>
            {(searchQuery || filterType !== "all" || filterStatus !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                  setFilterStatus("all");
                }}
                className="border-2 border-slate-300 hover:border-slate-400"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entries List */}
      {!isLoading && filteredEntries.length > 0 && (
      <div className="space-y-6">
        {Object.entries(groupedEntries)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, dayEntries]) => (
            <Card key={date} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  {date}
                </CardTitle>
                  <Badge variant="outline" className="bg-white text-slate-600">
                    {dayEntries.length} entr{dayEntries.length !== 1 ? 'ies' : 'y'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {dayEntries
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((e) => {
                      const time = new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const isVideo = e.type === "video";
                      const isDb = e._source === "db";
                      const isSelected = selectedEntries.has(e.id);
                      
                      return (
                        <div 
                          key={e.id} 
                          className={`group p-6 hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Selection Checkbox */}
                            {isDb && (
                              <div className="flex-shrink-0 mt-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectEntry(e.id)}
                                  className="h-4 w-4 text-blue-600 border-2 border-slate-300 rounded focus:ring-blue-500"
                                />
                              </div>
                            )}
                            
                            {/* Type Icon */}
                            <div className={`flex-shrink-0 mt-1 p-2 rounded-full ${
                              e.type === "medication" ? "bg-blue-100 text-blue-600" :
                              e.type === "activity" ? "bg-green-100 text-green-600" :
                              e.type === "mood" ? "bg-purple-100 text-purple-600" :
                              e.type === "symptom" ? "bg-red-100 text-red-600" :
                              e.type === "vitals" ? "bg-orange-100 text-orange-600" :
                              "bg-cyan-100 text-cyan-600"
                            }`}>
                              {getTypeIcon(e.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-slate-900 text-lg mb-1">{e.title}</h4>
                                  <p className="text-slate-600 text-sm leading-relaxed">{e.description}</p>
                                </div>
                                
                                {/* Time */}
                                <div className="flex-shrink-0 text-sm text-slate-500 flex items-center gap-1 ml-4">
                                  <Clock className="h-4 w-4" />
                                  {time}
                                </div>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge className={`${typeColor(e.type)} font-medium`}>
                                  {e.type.charAt(0).toUpperCase() + e.type.slice(1)}
                                </Badge>
                                <Badge className={`${statusBadge(e.status)} font-medium`} variant="outline">
                                  {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                                </Badge>
                                {isVideo && e.videoStatus && (
                                  <Badge variant="outline" className="capitalize bg-cyan-50 text-cyan-700 border-cyan-200">
                                    {e.videoStatus}
                                  </Badge>
                                )}
                              </div>

                              {/* Value and Notes */}
                              {!isVideo && e.value && (
                                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-sm font-medium text-blue-800">
                                    <span className="font-semibold">Value:</span> {e.value}
                                  </p>
                                </div>
                              )}

                              {isVideo && e.value && (
                                <div className="mb-3 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                                  <p className="text-sm font-medium text-cyan-800">
                                    <span className="font-semibold">Details:</span> {e.value}
                                  </p>
                                </div>
                              )}

                              {e.notes && (
                                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                  <p className="text-sm text-slate-700 italic">
                                    <span className="font-medium">Notes:</span> {e.notes}
                                  </p>
                                </div>
                              )}

                              {/* Video Link */}
                            {isVideo && e.videoUrl && (
                                <div className="mb-4">
                                <a href={e.videoUrl} target="_blank" rel="noreferrer">
                                    <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                                      <Play className="h-4 w-4 mr-2" />
                                      Open Video
                                  </Button>
                                </a>
                              </div>
                            )}

                              {/* Actions */}
                            {isDb && (
                                <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => updateEntry(e.id, { status: "completed" })}
                                    className="border-green-300 text-green-700 hover:bg-green-50"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Complete
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => updateEntry(e.id, { status: "missed" })}
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                  >
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Missed
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => updateEntry(e.id, { status: "partial" })}
                                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                  >
                                    <MoreHorizontal className="h-3 w-3 mr-1" />
                                    Partial
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => deleteEntry(e.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                </Button>
                              </div>
                            )}
                          </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
      )}
    </div>
  );
}
