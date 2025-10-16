"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface ProgressData {
  overallProgress: number;
  weeklyGoals: Array<{
    id: string;
    name: string;
    current: number;
    target: number;
    completed: boolean;
    category: string;
    priority: "high" | "medium" | "low";
    createdAt: string;
    updatedAt: string;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    date: string;
    completed: boolean;
    type: "major" | "minor";
    description: string;
    reward?: string;
  }>;
  progressMetrics: Array<{
    id: string;
    title: string;
    value: string;
    change: string;
    trend: "up" | "down" | "stable";
    icon: string;
    color: string;
    bgColor: string;
    category: string;
  }>;
  weeklyData: Array<{
    id: string;
    week: string;
    wellness: number;
    attendance: number;
    goals: number;
    mood: number;
    energy: number;
    sleep: number;
  }>;
  dailyCheckIns: Array<{
    id: string;
    date: string;
    mood: number;
    energy: number;
    sleep: number;
    stress: number;
    notes?: string;
  }>;
}

export interface ProgressUpdate {
  type: "goal" | "milestone" | "checkin" | "metric";
  id: string;
  data: any;
}

export function useProgressTracking() {
  const { patient, isAuthenticated } = useAuth();
  const [data, setData] = useState<ProgressData>({
    overallProgress: 0,
    weeklyGoals: [],
    milestones: [],
    progressMetrics: [],
    weeklyData: [],
    dailyCheckIns: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const patientId = patient?.user_id || patient?.id;

  // Fetch progress data
  const fetchProgressData = useCallback(async () => {
    if (!isAuthenticated || !patientId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("No access token available");
      }

      // Fetch all progress data with error handling for missing tables
      const [
        overviewRes,
        goalsRes,
        milestonesRes,
        metricsRes,
        weeklyRes,
        checkInsRes,
      ] = await Promise.allSettled([
        supabase
          .from("progress_overview")
          .select("*")
          .eq("patient_id", patientId)
          .maybeSingle(),
        supabase
          .from("weekly_goals")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("milestones")
          .select("*")
          .eq("patient_id", patientId)
          .order("date", { ascending: true }),
        supabase
          .from("progress_metrics")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("weekly_data")
          .select("*")
          .eq("patient_id", patientId)
          .order("week", { ascending: true }),
        supabase
          .from("daily_checkins")
          .select("*")
          .eq("patient_id", patientId)
          .order("date", { ascending: false })
          .limit(30),
      ]);

      // Handle results and errors
      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : { data: null, error: overviewRes.reason };
      const goals = goalsRes.status === 'fulfilled' ? goalsRes.value : { data: [], error: goalsRes.reason };
      const milestones = milestonesRes.status === 'fulfilled' ? milestonesRes.value : { data: [], error: milestonesRes.reason };
      const metrics = metricsRes.status === 'fulfilled' ? metricsRes.value : { data: [], error: metricsRes.reason };
      const weekly = weeklyRes.status === 'fulfilled' ? weeklyRes.value : { data: [], error: weeklyRes.reason };
      const checkIns = checkInsRes.status === 'fulfilled' ? checkInsRes.value : { data: [], error: checkInsRes.reason };

      // Check for errors (only log warnings for missing tables)
      const errors = [
        overview.error,
        goals.error,
        milestones.error,
        metrics.error,
        weekly.error,
        checkIns.error,
      ].filter(Boolean);

      // Log warnings for missing tables but don't throw errors
      if (errors.length > 0) {
        console.warn("Some progress tables may not exist yet:", errors.map(e => e?.message).join(", "));
      }

      // Calculate overall progress
      const goalsData = goals.data || [];
      const completedGoals = goalsData.filter(g => g.completed).length;
      const totalGoals = goalsData.length;
      const overallProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

      // Update progress overview if needed (only if table exists)
      if (overview.data && overview.data.overall_progress !== overallProgress) {
        try {
          await supabase
            .from("progress_overview")
            .upsert({
              patient_id: patientId,
              overall_progress: overallProgress,
              updated_at: new Date().toISOString(),
            });
        } catch (error) {
          console.warn("Could not update progress overview:", error);
        }
      }

      setData({
        overallProgress,
        weeklyGoals: goalsData.map(g => ({
          id: g.id,
          name: g.name,
          current: g.current || 0,
          target: g.target || 0,
          completed: g.completed || false,
          category: g.category || "general",
          priority: g.priority || "medium",
          createdAt: g.created_at,
          updatedAt: g.updated_at,
        })),
        milestones: (milestones.data || []).map(m => ({
          id: m.id,
          name: m.name,
          date: m.date,
          completed: m.completed || false,
          type: m.type || "minor",
          description: m.description || "",
          reward: m.reward,
        })),
        progressMetrics: (metrics.data || []).map(m => ({
          id: m.id,
          title: m.title,
          value: m.value || "0",
          change: m.change || "0",
          trend: m.trend || "stable",
          icon: m.icon || "trending-up",
          color: m.color || "text-gray-600",
          bgColor: m.bgcolor || "bg-gray-100",
          category: m.category || "general",
        })),
        weeklyData: (weekly.data || []).map(w => ({
          id: w.id,
          week: w.week,
          wellness: w.wellness || 0,
          attendance: w.attendance || 0,
          goals: w.goals || 0,
          mood: w.mood || 0,
          energy: w.energy || 0,
          sleep: w.sleep || 0,
        })),
        dailyCheckIns: (checkIns.data || []).map(c => ({
          id: c.id,
          date: c.date,
          mood: c.mood || 0,
          energy: c.energy || 0,
          sleep: c.sleep || 0,
          stress: c.stress || 0,
          notes: c.notes,
        })),
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching progress data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch progress data");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, patientId]);

  // Update progress data
  const updateProgress = useCallback(async (update: ProgressUpdate) => {
    if (!isAuthenticated || !patientId) return;

    try {
      switch (update.type) {
        case "goal":
          const { error: goalError } = await supabase
            .from("weekly_goals")
            .update({
              current: update.data.current,
              completed: update.data.completed,
              updated_at: new Date().toISOString(),
            })
            .eq("id", update.id)
            .eq("patient_id", patientId);

          if (goalError) {
            console.warn("Could not update goal:", goalError);
            return;
          }
          break;

        case "milestone":
          const { error: milestoneError } = await supabase
            .from("milestones")
            .update({
              completed: update.data.completed,
              updated_at: new Date().toISOString(),
            })
            .eq("id", update.id)
            .eq("patient_id", patientId);

          if (milestoneError) {
            console.warn("Could not update milestone:", milestoneError);
            return;
          }
          break;

        case "checkin":
          const { error: checkinError } = await supabase
            .from("daily_checkins")
            .upsert({
              patient_id: patientId,
              date: update.data.date,
              mood: update.data.mood,
              energy: update.data.energy,
              sleep: update.data.sleep,
              stress: update.data.stress,
              notes: update.data.notes,
              updated_at: new Date().toISOString(),
            });

          if (checkinError) {
            console.warn("Could not update check-in:", checkinError);
            return;
          }
          break;

        case "metric":
          const { error: metricError } = await supabase
            .from("progress_metrics")
            .update({
              value: update.data.value,
              change: update.data.change,
              trend: update.data.trend,
              updated_at: new Date().toISOString(),
            })
            .eq("id", update.id)
            .eq("patient_id", patientId);

          if (metricError) {
            console.warn("Could not update metric:", metricError);
            return;
          }
          break;
      }

      // Refresh data after update
      await fetchProgressData();
    } catch (err) {
      console.error("Error updating progress:", err);
      setError(err instanceof Error ? err.message : "Failed to update progress");
    }
  }, [isAuthenticated, patientId, fetchProgressData]);

  // Add new goal
  const addGoal = useCallback(async (goal: Omit<ProgressData["weeklyGoals"][0], "id" | "createdAt" | "updatedAt">) => {
    if (!isAuthenticated || !patientId) return;

    try {
      const { error } = await supabase
        .from("weekly_goals")
        .insert({
          patient_id: patientId,
          name: goal.name,
          current: goal.current,
          target: goal.target,
          completed: goal.completed,
          category: goal.category,
          priority: goal.priority,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn("Could not add goal:", error);
        setError("Database tables not set up yet. Please run the SQL script first.");
        return;
      }
      await fetchProgressData();
    } catch (err) {
      console.error("Error adding goal:", err);
      setError(err instanceof Error ? err.message : "Failed to add goal");
    }
  }, [isAuthenticated, patientId, fetchProgressData]);

  // Add daily check-in
  const addCheckIn = useCallback(async (checkIn: Omit<ProgressData["dailyCheckIns"][0], "id">) => {
    if (!isAuthenticated || !patientId) return;

    try {
      const { error } = await supabase
        .from("daily_checkins")
        .upsert({
          patient_id: patientId,
          date: checkIn.date,
          mood: checkIn.mood,
          energy: checkIn.energy,
          sleep: checkIn.sleep,
          stress: checkIn.stress,
          notes: checkIn.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn("Could not add check-in:", error);
        setError("Database tables not set up yet. Please run the SQL script first.");
        return;
      }
      await fetchProgressData();
    } catch (err) {
      console.error("Error adding check-in:", err);
      setError(err instanceof Error ? err.message : "Failed to add check-in");
    }
  }, [isAuthenticated, patientId, fetchProgressData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isAuthenticated || !patientId) return;

    // Initial fetch
    fetchProgressData();

    // Set up real-time subscriptions
    const channels = [
      supabase
        .channel("progress_goals")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "weekly_goals",
          filter: `patient_id=eq.${patientId}`,
        }, () => fetchProgressData())
        .subscribe(),
      supabase
        .channel("progress_milestones")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "milestones",
          filter: `patient_id=eq.${patientId}`,
        }, () => fetchProgressData())
        .subscribe(),
      supabase
        .channel("progress_checkins")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "daily_checkins",
          filter: `patient_id=eq.${patientId}`,
        }, () => fetchProgressData())
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [isAuthenticated, patientId, fetchProgressData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    updateProgress,
    addGoal,
    addCheckIn,
    refresh: fetchProgressData,
  };
}
