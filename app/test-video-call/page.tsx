"use client";

import VideoCallTest from "@/components/call/VideoCallTest";

export default function TestVideoCallPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Video Call Connection Test
          </h1>
          <p className="text-gray-600">
            Test the video call functionality between patients and staff
          </p>
        </div>
        
        <VideoCallTest />
        
        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">How to Test</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong>1. Test Realtime Connection:</strong> Click "Test Realtime" to verify Supabase realtime is working.
            </div>
            <div>
              <strong>2. Test Patient Call:</strong> Enter a conversation ID and click "Test Patient Call" to simulate a patient initiating a video call.
            </div>
            <div>
              <strong>3. Test Staff Call:</strong> Click "Test Staff Call" to simulate staff initiating a video call.
            </div>
            <div>
              <strong>4. Check Notifications:</strong> If you have the staff dashboard open in another tab, you should see incoming call notifications.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





