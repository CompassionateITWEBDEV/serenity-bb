// components/dashboard/upcoming-drug-tests.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestTube2, Calendar, Clock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export type DrugTestItem = {
  id: string | number;
  scheduledFor: string | null;  // ISO datetime from DB: drug_tests.scheduled_for
  status: "pending" | "completed" | "missed";
  testType?: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
};

export type UpcomingDrugTestsProps = {
  items: DrugTestItem[];
  loading?: boolean;
  className?: string;
};

/* Why: consistent, locale-aware formatting without hard-coding timezones */
function fmtDateTime(iso: string | null) {
  if (!iso) return { date: "Not scheduled", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  return { date, time };
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "completed")
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
  if (s === "missed")
    return <Badge variant="secondary" className="bg-red-100 text-red-700">Missed</Badge>;
  return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
}

export function UpcomingDrugTests({
  items,
  loading = false,
  className = "",
}: UpcomingDrugTestsProps) {
  const router = useRouter();
  
  // Graceful empty/loading states
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <TestTube2 className="h-5 w-5 text-yellow-600" />
            </div>
            Upcoming Drug Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter to show pending tests - show all pending tests, not just future ones
  // This includes tests scheduled for today and unscheduled tests
  const upcomingTests = items.filter(
    (test) => test.status === "pending"
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-yellow-100 p-2 rounded-lg">
            <TestTube2 className="h-5 w-5 text-yellow-600" />
          </div>
          Upcoming Drug Tests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingTests.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">No upcoming drug tests scheduled.</p>
            {items.some(t => t.status === "pending" && !t.scheduledFor) && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  You have unscheduled drug tests. Please contact the facility to schedule.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingTests.map((test) => {
              const { date, time } = fmtDateTime(test.scheduledFor);
              const testType = test.testType || test.metadata?.test_type || "Random";
              return (
                <div 
                  key={test.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/drug-tests/${test.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <TestTube2 className="h-4 w-4 text-yellow-600" />
                        {testType} Drug Test
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Please be prepared to take the test at the scheduled time.
                      </p>
                    </div>
                    <StatusBadge status={test.status} />
                  </div>

                  {test.scheduledFor && (
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {time}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/drug-tests/${test.id}`);
                      }}
                      className="flex-1 sm:flex-none"
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/dashboard/drug-tests");
                      }}
                      className="flex-1 sm:flex-none"
                    >
                      View All
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

