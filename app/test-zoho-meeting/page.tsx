import ZohoMeetingTest from "@/components/call/ZohoMeetingTest";

export default function TestZohoMeetingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Zoho Meeting Integration Test
          </h1>
          <p className="text-gray-600">
            Test the automatic meeting link generation and join functionality
          </p>
        </div>
        <ZohoMeetingTest />
      </div>
    </div>
  );
}
