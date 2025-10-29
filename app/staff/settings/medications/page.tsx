"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, Plus, Loader2, CheckCircle2, X, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type MedicationCallback = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  status: "pending" | "done" | "cancelled";
  medication_name: string | null;
  patient_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export default function StaffSettingsMedicationCallbacksPage() {
  const router = useRouter();
  const [callbacks, setCallbacks] = useState<MedicationCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCallback, setEditingCallback] = useState<MedicationCallback | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffId, setStaffId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    medication_name: "",
    patient_name: "",
    notes: "",
    status: "pending" as "pending" | "done" | "cancelled",
  });

  // Get staff ID and load callbacks
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setStaffId(session.user.id);
        await loadCallbacks(session.user.id);
      }
    };
    init();
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!staffId) return;

    const channel = supabase
      .channel('medication-callbacks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medication_callbacks',
          filter: `staff_id=eq.${staffId}`,
        },
        () => {
          loadCallbacks(staffId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId]);

  const loadCallbacks = async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let authHeader = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (err) {
        console.warn('Failed to get session token:', err);
      }

      const url = statusFilter !== "all" 
        ? `/api/staff/medication-callbacks?status=${statusFilter}`
        : `/api/staff/medication-callbacks`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authHeader && { 'Authorization': authHeader }),
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCallbacks(data.callbacks || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        setError(errorData.error || "Failed to load callbacks");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load callbacks");
      console.error("Error loading callbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      loadCallbacks(staffId);
    }
  }, [statusFilter, staffId]);

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const isToday = dateOnly.getTime() === today.getTime();
    const isTomorrow = dateOnly.getTime() === today.getTime() + 86400000;
    
    let dateStr = "";
    if (isToday) {
      dateStr = "Today";
    } else if (isTomorrow) {
      dateStr = "Tomorrow";
    } else {
      dateStr = date.toLocaleDateString("en-US", { weekday: "short" });
    }
    
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    
    return `${dateStr}, ${timeStr}`;
  };

  const openAddDialog = () => {
    setEditingCallback(null);
    setFormData({
      title: "",
      description: "",
      scheduled_at: "",
      medication_name: "",
      patient_name: "",
      notes: "",
      status: "pending",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (callback: MedicationCallback) => {
    setEditingCallback(callback);
    setFormData({
      title: callback.title,
      description: callback.description || "",
      scheduled_at: callback.scheduled_at ? new Date(callback.scheduled_at).toISOString().slice(0, 16) : "",
      medication_name: callback.medication_name || "",
      patient_name: callback.patient_name || "",
      notes: callback.notes || "",
      status: callback.status,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.scheduled_at) {
      setError("Title and scheduled time are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let authHeader = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (err) {
        console.warn('Failed to get session token:', err);
      }

      const url = editingCallback
        ? `/api/staff/medication-callbacks/${editingCallback.id}`
        : `/api/staff/medication-callbacks`;

      const method = editingCallback ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          ...(authHeader && { 'Authorization': authHeader }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
          medication_name: formData.medication_name || null,
          patient_name: formData.patient_name || null,
          notes: formData.notes || null,
          ...(editingCallback && { status: formData.status }),
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        if (staffId) {
          await loadCallbacks(staffId);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        setError(errorData.error || "Failed to save callback");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save callback");
      console.error("Error saving callback:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (callbackId: string, newStatus: "pending" | "done" | "cancelled") => {
    try {
      let authHeader = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (err) {
        console.warn('Failed to get session token:', err);
      }

      const response = await fetch(`/api/staff/medication-callbacks/${callbackId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          ...(authHeader && { 'Authorization': authHeader }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok && staffId) {
        await loadCallbacks(staffId);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDelete = async (callbackId: string) => {
    if (!confirm("Are you sure you want to delete this callback?")) return;

    try {
      let authHeader = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (err) {
        console.warn('Failed to get session token:', err);
      }

      const response = await fetch(`/api/staff/medication-callbacks/${callbackId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...(authHeader && { 'Authorization': authHeader }),
        },
      });

      if (response.ok && staffId) {
        await loadCallbacks(staffId);
      }
    } catch (err) {
      console.error("Error deleting callback:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/staff/settings")}
              className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center hover:bg-slate-200 transition"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h1 className="text-lg font-semibold">Medication Callback Tracker</h1>
          </div>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="h-4 w-4" /> Add callback
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Callbacks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Callbacks List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-500" />
                <p className="text-slate-600">Loading callbacks...</p>
              </div>
            ) : callbacks.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Callbacks Found</h3>
                <p className="text-slate-600 mb-4">
                  {statusFilter !== "all" 
                    ? `No ${statusFilter} callbacks.` 
                    : "You haven't created any medication callbacks yet."}
                </p>
                <Button onClick={openAddDialog} variant="outline">
                  <Plus className="h-4 w-4 mr-2" /> Create Your First Callback
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {callbacks.map((callback) => (
                  <li key={callback.id} className="px-4 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{callback.title}</h3>
                          <Badge
                            variant={callback.status === "done" ? "default" : "secondary"}
                            className={
                              callback.status === "done"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : callback.status === "cancelled"
                                ? "bg-gray-100 text-gray-700 border-gray-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }
                          >
                            {callback.status === "done" ? "Done" : callback.status === "cancelled" ? "Cancelled" : "Pending"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDateTime(callback.scheduled_at)}
                          </div>
                          {callback.medication_name && (
                            <span>Medication: {callback.medication_name}</span>
                          )}
                          {callback.patient_name && (
                            <span>Patient: {callback.patient_name}</span>
                          )}
                        </div>
                        {callback.description && (
                          <p className="text-sm text-slate-600 mb-2">{callback.description}</p>
                        )}
                        {callback.notes && (
                          <p className="text-xs text-slate-500 italic">Notes: {callback.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {callback.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(callback.id, "done")}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Done
                          </Button>
                        )}
                        {callback.status === "done" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(callback.id, "pending")}
                            className="text-amber-600 hover:text-amber-700"
                          >
                            Mark Pending
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(callback)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(callback.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCallback ? "Edit Medication Callback" : "Add New Medication Callback"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Methadone follow-up"
              />
            </div>
            <div>
              <Label htmlFor="scheduled_at">Scheduled Date & Time *</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="medication_name">Medication Name</Label>
              <Input
                id="medication_name"
                value={formData.medication_name}
                onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                placeholder="e.g., Methadone, Naltrexone"
              />
            </div>
            <div>
              <Label htmlFor="patient_name">Patient Name</Label>
              <Input
                id="patient_name"
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                placeholder="Patient name (optional)"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about this callback"
                rows={3}
              />
            </div>
            {editingCallback && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes (optional)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title || !formData.scheduled_at}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {editingCallback ? "Update" : "Create"} Callback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
