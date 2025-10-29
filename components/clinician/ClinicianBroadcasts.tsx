"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Radio, AlertCircle, Info } from "lucide-react";

export type Broadcast = { 
  id: string; 
  title: string; 
  body: string; 
  timeLabel: string;
  author_name?: string;
  author_role?: string;
  target_audience?: string;
  priority?: string;
  created_at?: string;
};

type Props = { 
  items?: Broadcast[]; 
};

export default function ClinicianBroadcasts({ items }: Props) {
  const [q, setQ] = useState("");
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(items || []);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Fetch broadcasts targeted at clinicians
  useEffect(() => {
    fetchBroadcasts();
    
    // Real-time subscription
    const ch = supabase
      .channel('rt-clinician-broadcasts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'broadcasts',
        filter: 'target_audience=in.(all,clinicians)'
      }, (payload) => {
        const row: any = payload.new;
        const b = { 
          ...row, 
          timeLabel: formatTimeLabel(row.created_at) 
        };
        setBroadcasts((prev) => [b, ...prev]);
        toast.success('New broadcast received!');
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'broadcasts',
        filter: 'target_audience=in.(all,clinicians)'
      }, (payload) => {
        const row: any = payload.new;
        const b = { 
          ...row, 
          timeLabel: formatTimeLabel(row.updated_at || row.created_at) 
        };
        setBroadcasts((prev) => prev.map((x) => (x.id === b.id ? b : x)));
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'broadcasts',
        filter: 'target_audience=in.(all,clinicians)'
      }, (payload) => {
        const row: any = payload.old;
        setBroadcasts((prev) => prev.filter((x) => x.id !== row.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/broadcasts?audience=clinicians');
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

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-300 bg-red-50';
      case 'high':
        return 'border-orange-300 bg-orange-50';
      case 'normal':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-slate-200 bg-white';
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return broadcasts;
    return broadcasts.filter(b => 
      (b.title + " " + b.body + " " + b.timeLabel).toLowerCase().includes(s)
    );
  }, [broadcasts, q]);

  if (loading && broadcasts.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center text-slate-500">
          Loading broadcasts...
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search broadcasts..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <svg 
          viewBox="0 0 24 24" 
          className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" 
          fill="none" 
          stroke="currentColor"
        >
          <circle cx="11" cy="11" r="7" strokeWidth="2"/>
          <path d="M21 21l-4.3-4.3" strokeWidth="2"/>
        </svg>
      </div>

      {/* Broadcasts List */}
      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center text-slate-500">
            No broadcasts at this time.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <Card 
              key={b.id} 
              className={`shadow-sm border-l-4 ${getPriorityColor(b.priority)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center shrink-0">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{b.title}</h3>
                        {b.priority && b.priority !== 'normal' && (
                          <Badge 
                            variant={b.priority === 'urgent' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {b.priority}
                          </Badge>
                        )}
                        {getPriorityIcon(b.priority)}
                      </div>
                      <div className="text-xs text-slate-500">{b.timeLabel}</div>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{b.body}</p>
                    {b.author_name && (
                      <div className="text-xs text-slate-400 mt-2">
                        From {b.author_name} ({b.author_role})
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

