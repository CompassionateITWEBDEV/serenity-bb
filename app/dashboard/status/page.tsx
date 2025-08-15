import RealTimeStatusTracker from "@/components/dashboard/real-time-status-tracker"

export default function StatusPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Patient Status Tracking</h1>
        <p className="text-gray-600 mt-2">Monitor your recovery progress and update your daily status in real-time</p>
      </div>

      <RealTimeStatusTracker />
    </div>
  )
}
