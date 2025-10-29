"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export type Broadcast = { 
  id: string; 
  title: string; 
  body: string; 
  timeLabel: string;
  author_name?: string;
  author_role?: string;
  target_audience?: string;
  priority?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type Props = { 
  items?: Broadcast[]; 
  onNew?: () => void; 
  variant?: "web" | "mobile";
  showActions?: boolean;
};

const IconBtn: React.FC<React.PropsWithChildren<{ title?: string; onClick?: () => void }>> = ({ title, children, onClick }) => (
  <button 
    aria-label={title} 
    title={title} 
    onClick={onClick}
    className="h-8 w-8 rounded-full border border-slate-200 grid place-items-center hover:bg-slate-50 active:scale-[.98] transition"
  >
    {children}
  </button>
);

const Icons = {
  phone:   <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M2 5a3 3 0 0 1 3-3h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a3 3 0 0 1-3 3h-1C9.8 20.5 3.5 14.2 2 7V5z"/></svg>,
  calendar:<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2"/></svg>,
  chat:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/></svg>,
  mic:     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><rect x="9" y="2" width="6" height="12" rx="3" strokeWidth="2"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3" strokeWidth="2"/></svg>,
  bell:    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0" strokeWidth="2"/></svg>,
  filter:  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 5h18M7 12h10M10 19h4"/></svg>,
  search:  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2"/><path d="M21 21l-4.3-4.3" strokeWidth="2"/></svg>,
  broadcast:<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 7v10M8 9v6M16 9v6"/><circle cx="12" cy="12" r="9" strokeWidth="2"/></svg>,
  inbox:   <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M20 7H4l-2 6 4 6h12l4-6-2-6z"/><path strokeWidth="2" d="M2 13h6a4 4 0 0 0 8 0h6"/></svg>,
  people:  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M16 11a4 4 0 1 0-8 0"/><path strokeWidth="2" d="M3 21a7 7 0 0 1 18 0"/></svg>,
  home:    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 10.5 12 3l9 7.5V21H6v-6H9v6H4z"/></svg>,
  settings:<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"><path strokeWidth="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path strokeWidth="2" d="M19.4 15a1.6 1.6 0 0 0 .4 1.8l.1.1a2 2 0 1 1-2.9 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.4 1.6 1.6 0 0 0-1 1.5V22a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.4l-.1.1A2 2 0 1 1 3.2 19.7l.1-.1c.4-.5.5-1.2.4-1.8a1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1c.7 0 1.2-.4 1.5-1 .2-.6.1-1.3-.4-1.8l-.1-.1A2 2 0 1 1 5.9 3.2l.1.1c.5.4 1.2.5 1.8.4.6-.3 1-.8 1-1.5V2a2 2 0 1 1 4 0v.1c0 .7.4 1.2 1 1.5.6.1 1.3 0 1.8-.4l.1-.1A2 2 0 1 1 20.8 6l-.1.1c-.5.5-.6 1.2-.4 1.8.3.6.8 1 1.5 1H22a2 2 0 1 1 0 4h-.1c-.7 0-1.2.4-1.5 1z"/></svg>,
};

const SEED: Broadcast[] = [
  { id: "b1", title: "Everyone", body: "Broadcast for all staff members. Important updates and announcements will appear here.", timeLabel: "Yesterday – 04:37 AM" },
];

export default function Broadcasts({ items, onNew, variant = "web", showActions = true }: Props) {
  const [q, setQ] = useState("");
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(items || []);
  const [loading, setLoading] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [newBroadcast, setNewBroadcast] = useState({
    title: "",
    body: "",
    target_audience: "all",
    priority: "normal"
  });
  const router = useRouter();
  const supabase = createClient();

  // Fetch broadcasts from API
  useEffect(() => {
    fetchBroadcasts();
    
    // Set up real-time subscription
    const channel = supabase.channel('staff-broadcasts', {
      config: { broadcast: { ack: true } },
    });

    channel
      .on('broadcast', { event: 'new-broadcast' }, (payload) => {
        console.log('New broadcast received:', payload);
        const newBroadcast = {
          ...payload.payload.broadcast,
          timeLabel: formatTimeLabel(payload.payload.broadcast.created_at)
        };
        setBroadcasts(prev => [newBroadcast, ...prev]);
        toast.success('New broadcast received!');
      })
      .on('broadcast', { event: 'broadcast-updated' }, (payload) => {
        console.log('Broadcast updated:', payload);
        const updatedBroadcast = {
          ...payload.payload.broadcast,
          timeLabel: formatTimeLabel(payload.payload.broadcast.updated_at || payload.payload.broadcast.created_at)
        };
        setBroadcasts(prev => prev.map(b => b.id === updatedBroadcast.id ? updatedBroadcast : b));
        toast.info('Broadcast updated');
      })
      .on('broadcast', { event: 'broadcast-deleted' }, (payload) => {
        console.log('Broadcast deleted:', payload);
        setBroadcasts(prev => prev.filter(b => b.id !== payload.payload.broadcastId));
        toast.info('Broadcast deleted');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/broadcasts');
      if (response.ok) {
        const data = await response.json();
        const formattedBroadcasts = data.broadcasts.map((b: any) => ({
          ...b,
          timeLabel: formatTimeLabel(b.created_at)
        }));
        setBroadcasts(formattedBroadcasts);
      }
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      toast.error('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLabel = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return `Yesterday – ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleCreateBroadcast = async () => {
    try {
      const response = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBroadcast)
      });

      if (response.ok) {
        toast.success('Broadcast created successfully');
        setIsNewDialogOpen(false);
        setNewBroadcast({ title: "", body: "", target_audience: "all", priority: "normal" });
        fetchBroadcasts();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create broadcast');
      }
    } catch (error) {
      console.error('Error creating broadcast:', error);
      toast.error('Failed to create broadcast');
    }
  };

  const handleEditBroadcast = async () => {
    if (!editingBroadcast) return;
    
    try {
      const response = await fetch('/api/broadcasts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBroadcast.id,
          title: editingBroadcast.title,
          body: editingBroadcast.body,
          target_audience: editingBroadcast.target_audience,
          priority: editingBroadcast.priority
        })
      });

      if (response.ok) {
        toast.success('Broadcast updated successfully');
        setIsEditDialogOpen(false);
        setEditingBroadcast(null);
        fetchBroadcasts();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update broadcast');
      }
    } catch (error) {
      console.error('Error updating broadcast:', error);
      toast.error('Failed to update broadcast');
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;
    
    try {
      const response = await fetch(`/api/broadcasts?id=${broadcastId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Broadcast deleted successfully');
        fetchBroadcasts();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete broadcast');
      }
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      toast.error('Failed to delete broadcast');
    }
  };

  const openEditDialog = (broadcast: Broadcast) => {
    setEditingBroadcast({ ...broadcast });
    setIsEditDialogOpen(true);
  };

  const handleActionClick = (action: string) => {
    switch (action) {
      case 'call':
        router.push('/staff/dashboard?tab=calls');
        break;
      case 'calendar':
        router.push('/staff/schedule');
        break;
      case 'chat':
        router.push('/staff/messages');
        break;
      case 'record':
        router.push('/staff/recordings');
        break;
      case 'alerts':
        router.push('/staff/notifications');
        break;
      default:
        break;
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return broadcasts;
    return broadcasts.filter(b => (b.title + " " + b.body + " " + b.timeLabel).toLowerCase().includes(s));
  }, [broadcasts, q]);

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400">{Icons.search}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search broadcasts..."
            className="w-full pl-9 pr-3 py-2 rounded-full bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>
        <IconBtn title="Filter">{Icons.filter}</IconBtn>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">
          Broadcasts {loading && <span className="text-xs text-slate-400">(loading...)</span>}
        </div>
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <button className="text-sm text-cyan-600 hover:underline">New Broadcast</button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle>Create New Broadcast</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newBroadcast.title}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter broadcast title..."
                  className="bg-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={newBroadcast.body}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Enter broadcast message..."
                  rows={4}
                  className="bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select
                    value={newBroadcast.target_audience}
                    onValueChange={(value) => setNewBroadcast(prev => ({ ...prev, target_audience: value }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="staff">Staff Only</SelectItem>
                      <SelectItem value="patients">Patients Only</SelectItem>
                      <SelectItem value="clinicians">Clinicians Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newBroadcast.priority}
                    onValueChange={(value) => setNewBroadcast(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateBroadcast}
                disabled={!newBroadcast.title.trim() || !newBroadcast.body.trim()}
              >
                Create Broadcast
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Broadcast</DialogTitle>
          </DialogHeader>
          {editingBroadcast && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingBroadcast.title}
                  onChange={(e) => setEditingBroadcast(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter broadcast title..."
                  className="bg-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-body">Message</Label>
                <Textarea
                  id="edit-body"
                  value={editingBroadcast.body}
                  onChange={(e) => setEditingBroadcast(prev => prev ? { ...prev, body: e.target.value } : null)}
                  placeholder="Enter broadcast message..."
                  rows={4}
                  className="bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-audience">Target Audience</Label>
                  <Select
                    value={editingBroadcast.target_audience || "all"}
                    onValueChange={(value) => setEditingBroadcast(prev => prev ? { ...prev, target_audience: value } : null)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="staff">Staff Only</SelectItem>
                      <SelectItem value="patients">Patients Only</SelectItem>
                      <SelectItem value="clinicians">Clinicians Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editingBroadcast.priority || "normal"}
                    onValueChange={(value) => setEditingBroadcast(prev => prev ? { ...prev, priority: value } : null)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditBroadcast}
              disabled={!editingBroadcast?.title.trim() || !editingBroadcast?.body.trim()}
            >
              Update Broadcast
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ul className="space-y-3">
        {loading ? (
          <li className="py-8 text-center text-slate-400 text-sm">Loading broadcasts...</li>
        ) : filtered.length === 0 ? (
          <li className="py-8 text-center text-slate-400 text-sm">No broadcasts found</li>
        ) : (
          filtered.map((b) => (
            <li key={b.id} className="rounded-2xl border bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center shrink-0">
                  {Icons.broadcast}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-800">{b.title}</div>
                      {b.priority && b.priority !== 'normal' && (
                        <Badge 
                          variant={b.priority === 'urgent' ? 'destructive' : b.priority === 'high' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {b.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="text-[10px] text-slate-500">{b.timeLabel}</div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditDialog(b)}
                          className="h-6 w-6 rounded-full hover:bg-slate-100 grid place-items-center transition"
                          title="Edit broadcast"
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                            <path strokeWidth="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path strokeWidth="2" d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="h-6 w-6 rounded-full hover:bg-red-100 grid place-items-center transition text-red-600"
                          title="Delete broadcast"
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                            <path strokeWidth="2" d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{b.body}</p>
                  {b.author_name && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      By {b.author_name} • {b.target_audience}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {variant === "mobile" && (
        <div className="mt-3 rounded-2xl bg-white border border-slate-200 px-4">
          <div className="flex justify-between py-3">
            <IconBtn title="Messages" onClick={() => router.push('/staff/messages')}>{Icons.inbox}</IconBtn>
            <IconBtn title="Teams" onClick={() => router.push('/staff/hidden-groups')}>{Icons.people}</IconBtn>
            <IconBtn title="Home" onClick={() => router.push('/staff/dashboard')}>{Icons.home}</IconBtn>
            <IconBtn title="Settings" onClick={() => router.push('/staff/profile')}>{Icons.settings}</IconBtn>
          </div>
        </div>
      )}
    </section>
  );
}
