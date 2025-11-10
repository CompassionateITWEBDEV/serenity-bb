// path: app/dashboard/progress/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useProgressTracking } from "@/hooks/use-progress-tracking";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  Calendar,
  Target,
  Heart,
  Clock,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Award,
  Star,
  Activity,
  Brain,
  Zap,
  type Icon as LucideIcon,
} from "lucide-react";

/* ===== types & helpers ===== */
const iconMap: Record<string, LucideIcon> = { 
  Calendar, Heart, Target, CheckCircle, TrendingUp, Award, Star, Activity, Brain, Zap 
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

// Progress Metrics Component
function ProgressMetrics({ metrics, onAddCheckIn }: { metrics: any[], onAddCheckIn: () => void }) {
  if (metrics.length === 0) {
    return (
      <div className="col-span-full bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-blue-200 rounded-lg p-8 text-center">
        <div className="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Activity className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Metrics</h3>
        <p className="text-gray-600 mb-4">Your progress metrics will appear here as you complete activities</p>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={onAddCheckIn}>
          <Plus className="h-4 w-4 mr-2" />
          Add Check-in
        </Button>
      </div>
    );
  }

  return (
    <>
      {metrics.map((metric, i) => {
        const Icon = iconMap[metric.icon] || Activity;
        return (
          <Card key={metric.id || i} className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${metric.bgColor || "bg-blue-100"}`}>
                  <Icon className={`h-6 w-6 ${metric.color || "text-blue-600"}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  metric.trend === "up" ? "text-green-600" : 
                  metric.trend === "down" ? "text-red-600" : "text-gray-600"
                }`}>
                  {metric.trend === "up" ? <ArrowUp className="h-4 w-4" /> : 
                   metric.trend === "down" ? <ArrowDown className="h-4 w-4" /> : 
                   <div className="h-4 w-4 rounded-full bg-gray-400" />}
                  {metric.change}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-sm text-gray-600">{metric.title}</div>
                <Badge variant="outline" className="text-xs">
                  {metric.category}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}

// Weekly Goals Component
function WeeklyGoals({ goals, onUpdateGoal, onAddGoal }: { 
  goals: any[], 
  onUpdateGoal: (id: string, data: any) => void,
  onAddGoal: (goal: any) => void 
}) {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: "",
    target: 1,
    category: "general",
    priority: "medium" as "high" | "medium" | "low"
  });

  const handleAddGoal = () => {
    if (newGoal.name.trim()) {
      onAddGoal({
        ...newGoal,
        current: 0,
        completed: false,
      });
      setNewGoal({ name: "", target: 1, category: "general", priority: "medium" });
      setIsAddingGoal(false);
    }
  };

  const handleUpdateProgress = (goalId: string, current: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      onUpdateGoal(goalId, {
        current,
        completed: current >= goal.target
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            This Week's Goals
          </CardTitle>
          <Button onClick={() => setIsAddingGoal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {goals.length === 0 && !isAddingGoal && (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No goals set for this week</p>
            <Button onClick={() => setIsAddingGoal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Set Your First Goal
            </Button>
          </div>
        )}

        {isAddingGoal && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input
                  value={newGoal.name}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Complete 3 therapy sessions"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newGoal.priority} onValueChange={(value: any) => setNewGoal(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddGoal} size="sm">
                  Add Goal
                </Button>
                <Button variant="outline" onClick={() => setIsAddingGoal(false)} size="sm">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {goals.map((goal) => {
          const progress = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
          const remaining = Math.max(goal.target - goal.current, 0);
          
          return (
            <div key={goal.id} className="space-y-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-gray-900">{goal.name}</h4>
                  <Badge variant={goal.priority === "high" ? "default" : "outline"} className="text-xs">
                    {goal.priority}
                  </Badge>
                  {goal.completed && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {goal.current}/{goal.target}
                </div>
              </div>
              
              <Progress value={progress} className="h-3" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{progress}% complete</span>
                <span className="text-gray-500">{remaining} remaining</span>
              </div>

              {!goal.completed && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateProgress(goal.id, Math.min(goal.current + 1, goal.target))}
                    disabled={goal.current >= goal.target}
                  >
                    +1
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max={goal.target}
                    value={goal.current}
                    onChange={(e) => handleUpdateProgress(goal.id, Math.min(parseInt(e.target.value) || 0, goal.target))}
                    className="w-20 h-8"
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Milestones Component
function Milestones({ milestones, onUpdateMilestone }: { 
  milestones: any[], 
  onUpdateMilestone: (id: string, data: any) => void 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-600" />
          Recovery Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No milestones set yet</p>
            <p className="text-sm text-gray-400">Milestones will appear as you progress through your recovery journey</p>
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone, i) => (
              <div key={milestone.id || i} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className={`p-3 rounded-full ${milestone.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {milestone.completed ? <CheckCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{milestone.name}</h4>
                    <Badge variant={milestone.type === "major" ? "default" : "outline"}>
                      {milestone.type === "major" ? "Major" : "Minor"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{milestone.description}</p>
                  <p className="text-xs text-gray-500">{milestone.date}</p>
                  {milestone.reward && (
                    <p className="text-xs text-yellow-600 mt-1">🎁 {milestone.reward}</p>
                  )}
                </div>
                {!milestone.completed && (
                  <Button
                    size="sm"
                    onClick={() => onUpdateMilestone(milestone.id, { completed: true })}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Trends Component
function Trends({ weeklyData, dailyCheckIns, onAddCheckIn }: { weeklyData: any[], dailyCheckIns: any[], onAddCheckIn: () => void }) {
  const getWeekLabel = (week: string) => {
    const date = new Date(week);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Weekly Progress Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyData.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No trend data available yet</p>
              <p className="text-sm text-gray-400 mt-2">Weekly progress will be tracked here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {weeklyData.map((week, i) => (
                <div key={week.id || i} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{getWeekLabel(week.week)}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-pink-600">Wellness: {week.wellness}/10</span>
                      <span className="text-green-600">Attendance: {clamp(week.attendance)}%</span>
                      <span className="text-blue-600">Goals: {clamp(week.goals)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">Wellness</div>
                      <Progress value={clamp(week.wellness * 10)} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">Attendance</div>
                      <Progress value={clamp(week.attendance)} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">Goals</div>
                      <Progress value={clamp(week.goals)} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-600" />
              Daily Check-ins
            </CardTitle>
            <Button size="sm" onClick={onAddCheckIn}>
              <Plus className="h-4 w-4 mr-2" />
              Add Check-in
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dailyCheckIns.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No check-ins recorded yet</p>
              <Button onClick={onAddCheckIn}>
                <Plus className="h-4 w-4 mr-2" />
                Add Today's Check-in
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {dailyCheckIns.slice(0, 7).map((checkIn, i) => (
                <div key={checkIn.id || i} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(checkIn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-gray-600">Mood</div>
                      <div className="font-medium">{checkIn.mood}/10</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Energy</div>
                      <div className="font-medium">{checkIn.energy}/10</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Sleep</div>
                      <div className="font-medium">{checkIn.sleep}h</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Stress</div>
                      <div className="font-medium">{checkIn.stress}/10</div>
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

export default function ProgressPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();
  const { data, loading: progressLoading, error, updateProgress, addGoal, addCheckIn, refresh } = useProgressTracking();
  const { data: dashboardData } = useDashboardData();
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [checkInData, setCheckInData] = useState({
    mood: 5,
    energy: 5,
    sleep: 8,
    stress: 5,
    notes: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || progressLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center" aria-live="polite" aria-busy="true">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your progress...</p>
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

  const handleUpdateGoal = (goalId: string, goalData: any) => {
    updateProgress({
      type: "goal",
      id: goalId,
      data: goalData,
    });
  };

  const handleUpdateMilestone = (milestoneId: string, milestoneData: any) => {
    updateProgress({
      type: "milestone",
      id: milestoneId,
      data: milestoneData,
    });
  };

  const handleAddGoal = (goalData: any) => {
    addGoal(goalData);
  };

  const handleAddCheckIn = async () => {
    try {
      await addCheckIn({
        date: new Date().toISOString().split('T')[0],
        mood: checkInData.mood,
        energy: checkInData.energy,
        sleep: checkInData.sleep,
        stress: checkInData.stress,
        notes: checkInData.notes,
      });
      toast.success("Check-in added successfully!");
      setIsCheckInDialogOpen(false);
      setCheckInData({ mood: 5, energy: 5, sleep: 8, stress: 5, notes: "" });
    } catch (err) {
      console.error("Error adding check-in:", err);
      toast.error("Failed to add check-in. Please try again.");
    }
  };

  // Use overall progress from dashboard API if available, otherwise use local data
  const overallProgress = dashboardData?.kpis?.progressPercent ?? data.overallProgress;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Progress Tracking</h1>
                <p className="text-gray-600 mt-1">Monitor your recovery journey and celebrate achievements</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {data.lastUpdated && (
                <div className="text-sm text-gray-500">
                  Last updated: {data.lastUpdated.toLocaleTimeString()}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-800">Unable to load progress data</h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  className="text-red-800 border-red-300 hover:bg-red-100"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Overall Progress */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-xl font-semibold">Overall Recovery Progress</span>
              <Badge variant="outline" className="text-lg px-4 py-2 bg-blue-50 text-blue-700 border-blue-200">
                {overallProgress}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="h-4 mb-4" />
            <div className="flex justify-between text-sm text-gray-600 font-medium">
              <span>Started Treatment</span>
              <span>Current Progress</span>
              <span>Recovery Goals</span>
            </div>
          </CardContent>
        </Card>

        {/* Progress Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ProgressMetrics metrics={data.progressMetrics} onAddCheckIn={() => setIsCheckInDialogOpen(true)} />
        </div>

        {/* Add Check-in Dialog */}
        <Dialog open={isCheckInDialogOpen} onOpenChange={setIsCheckInDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Daily Check-in</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mood (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={checkInData.mood}
                  onChange={(e) => setCheckInData(prev => ({ ...prev, mood: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Energy Level (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={checkInData.energy}
                  onChange={(e) => setCheckInData(prev => ({ ...prev, energy: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Sleep Hours</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={checkInData.sleep}
                  onChange={(e) => setCheckInData(prev => ({ ...prev, sleep: parseInt(e.target.value) || 8 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Stress Level (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={checkInData.stress}
                  onChange={(e) => setCheckInData(prev => ({ ...prev, stress: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={checkInData.notes}
                  onChange={(e) => setCheckInData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="How are you feeling today?"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCheckInDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCheckIn}>
                Save Check-in
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs defaultValue="weekly" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="weekly" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Weekly Goals
            </TabsTrigger>
            <TabsTrigger value="milestones" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Milestones
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Trends
            </TabsTrigger>
          </TabsList>

          {/* Weekly Goals */}
          <TabsContent value="weekly" className="space-y-6">
            <WeeklyGoals 
              goals={data.weeklyGoals} 
              onUpdateGoal={handleUpdateGoal}
              onAddGoal={handleAddGoal}
            />
          </TabsContent>

          {/* Milestones */}
          <TabsContent value="milestones" className="space-y-6">
            <Milestones 
              milestones={data.milestones} 
              onUpdateMilestone={handleUpdateMilestone}
            />
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends" className="space-y-6">
            <Trends 
              weeklyData={data.weeklyData} 
              dailyCheckIns={data.dailyCheckIns}
              onAddCheckIn={() => setIsCheckInDialogOpen(true)}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
