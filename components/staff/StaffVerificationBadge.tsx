"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Star } from "lucide-react";

interface StaffVerificationBadgeProps {
  staffId: string;
  showCount?: boolean;
  showRating?: boolean;
}

export default function StaffVerificationBadge({ 
  staffId, 
  showCount = true,
  showRating = true 
}: StaffVerificationBadgeProps) {
  const [stats, setStats] = useState<{
    totalVerifications: number;
    averageRating: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) return;

    const loadStats = async () => {
      try {
        // Get session token for authentication
        const { data: { session } } = await supabase.auth.getSession();
        const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

        const res = await fetch(`/api/staff/verifications?staffId=${staffId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { 'Authorization': authHeader })
          }
        });

        if (res.ok) {
          try {
            const data = await res.json();
            setStats(data.stats || { totalVerifications: 0, averageRating: null });
          } catch (parseError) {
            console.error("Failed to parse verification stats response:", parseError);
            setStats({ totalVerifications: 0, averageRating: null });
          }
        } else {
          // Try to get error details
          let errorText = '';
          let errorJson = null;
          try {
            errorText = await res.text();
            errorJson = errorText ? JSON.parse(errorText) : null;
          } catch (e) {
            // Not JSON, use text
            errorText = errorText || res.statusText || 'Unknown error';
          }
          
          console.error("Failed to load verification stats:", {
            status: res.status,
            statusText: res.statusText,
            url: res.url,
            errorText: errorText,
            errorJson: errorJson,
            headers: Object.fromEntries(res.headers.entries())
          });
          
          // Set empty stats so component doesn't show anything
          setStats({ totalVerifications: 0, averageRating: null });
        }
      } catch (error) {
        console.error("Error loading verification stats:", error);
        // Set empty stats on error so component doesn't show anything
        setStats({ totalVerifications: 0, averageRating: null });
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`staff-verifications-${staffId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_verifications',
          filter: `staff_id=eq.${staffId}`,
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId]);

  if (loading || !stats) {
    return null;
  }

  if (stats.totalVerifications === 0) {
    return null; // Don't show badge if no verifications
  }

  return (
    <Badge 
      variant="secondary" 
      className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
      title={`Verified by ${stats.totalVerifications} ${stats.totalVerifications === 1 ? 'patient' : 'patients'}${stats.averageRating ? ` • Average rating: ${stats.averageRating}/5` : ''}`}
    >
      <CheckCircle2 className="h-3 w-3 mr-1" />
      {showCount && <span className="mr-1">{stats.totalVerifications}</span>}
      {showRating && stats.averageRating && (
        <>
          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
          <span>{stats.averageRating}</span>
        </>
      )}
    </Badge>
  );
}



