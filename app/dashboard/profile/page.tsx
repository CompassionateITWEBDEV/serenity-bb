
"use server"



import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Phone, Mail, MapPin, Heart, Activity, Award, Clock, Target, TrendingUp, Edit } from "lucide-react"

function fmtDate(d?: string | null) {
  if (!d) return "-";
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(d)) } catch { return d }
}

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: () => cookieStore }
  )

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes.user) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="mt-2 text-red-600">Sign in to view your profile.</p>
      </div>
    )
  }
  const uid = userRes.user.id

  // Patient profile
  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .select("user_id, full_name, email, first_name, last_name, phone_number, date_of_birth")
    .eq("user_id", uid)
    .maybeSingle()

  // Upcoming appointments
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, appointment_time, status, staff, notes")
    .eq("patient_id", uid)
    .gte("appointment_time", new Date().toISOString())
    .order("appointment_time", { ascending: true })
    .limit(2)

  // Rewards balance
  const { data: balance } = await supabase.rpc<number>("get_my_balance")

  // Derived display values
  const firstName = patient?.first_name || userRes.user.user_metadata?.first_name || (patient?.full_name?.split(" ")[0] ?? "")
  const lastName = patient?.last_name || userRes.user.user_metadata?.last_name || (patient?.full_name?.split(" ").slice(1).join(" ") ?? "")
  const displayName = (patient?.full_name || `${firstName} ${lastName}`.trim() || userRes.user.user_metadata?.full_name || userRes.user.email || "Patient").trim()
  const initials = (displayName.match(/\b\w/g) || []).slice(0,2).join("").toUpperCase() || "P"

  // Simple health metrics placeholders until you wire real sources
  const healthMetrics = [
    { label: "Overall Progress", value: 78 },
    { label: "Treatment Adherence", value: 92 },
    { label: "Wellness Score", value: 85 },
    { label: "Goal Completion", value: 67 },
  ]

  // Achievements (example: map recent redemptions or earned tokens)
  const { data: txns } = await supabase
    .from("token_transactions")
    .select("id, transaction_type, amount, reason, created_at")
    .eq("patient_id", uid)
    .order("created_at", { ascending: false })
    .limit(6)

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
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">{displayName}</CardTitle>
              <CardDescription>UID: {uid}</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">Patient</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patient?.email ?? userRes.user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patient?.phone_number ?? "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Born {fmtDate(patient?.date_of_birth as any)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Tokens: <b>{balance ?? 0}</b></span>
              </div>
              <form action="/dashboard/profile/edit">
                <Button className="w-full mt-2">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </form>
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
              {healthMetrics.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <Progress value={m.value} className="h-2" />
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
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Complete 90-day program</span>
                        <Badge variant="secondary">In Progress</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Weekly therapy sessions</span>
                        <Badge variant="secondary">On Track</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Daily meditation practice</span>
                        <Badge variant="secondary">Active</Badge>
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
                      <div className="flex justify-between"><span className="text-sm">Days in treatment</span><span className="font-medium">—</span></div>
                      <div className="flex justify-between"><span className="text-sm">Sessions completed</span><span className="font-medium">—</span></div>
                      <div className="flex justify-between"><span className="text-sm">Goals achieved</span><span className="font-medium">—</span></div>
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
                    <p className="text-sm opacity-70">Wire to your staff assignment table when available.</p>
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
                    {appts && appts.length > 0 ? (
                      <ul className="space-y-3">
                        {appts.map((a) => (
                          <li key={a.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <div className="text-sm font-medium">{new Date(a.appointment_time as string).toLocaleString()}</div>
                              <div className="text-xs opacity-70">{a.staff || "Staff TBD"}</div>
                            </div>
                            <Badge variant="outline" className="capitalize">{a.status}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm opacity-70">No upcoming appointments.</p>
                    )}
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
                <CardContent>
                  <p className="text-sm opacity-70">Connect to your medical records tables when ready.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Achievements & Rewards</CardTitle>
                  <CardDescription>Recent token activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(txns ?? []).map((t) => (
                      <div key={t.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="text-2xl">{t.transaction_type === 'earned' ? '🏆' : '🎟️'}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{t.reason}</h4>
                          <p className="text-sm text-gray-600">{t.transaction_type === 'earned' ? '+' : '-'}{t.amount} tokens</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(t.created_at as string).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    {(txns ?? []).length === 0 && <p className="text-sm opacity-70">No token activity yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Hook this to your activity/event stream</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm opacity-70">No activity available.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {!patient && (
        <div className="rounded-xl border p-4 mt-6 text-sm text-amber-700 bg-amber-50">
          No patient profile found. Create one after sign up so rewards and appointments show here.
        </div>
      )}

      {pErr && (
        <pre className="text-xs whitespace-pre-wrap bg-red-50 border text-red-700 p-3 rounded-xl mt-4">{String(pErr.message)}</pre>
      )}
    </div>
  )
}
