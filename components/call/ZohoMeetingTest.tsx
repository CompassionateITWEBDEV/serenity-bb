"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Video, Users } from "lucide-react";

export default function ZohoMeetingTest() {
  const [conversationId, setConversationId] = useState("");
  const [patientName, setPatientName] = useState("John Doe");
  const [staffName, setStaffName] = useState("Dr. Smith");
  const [isLoading, setIsLoading] = useState(false);
  const [meetingData, setMeetingData] = useState<any>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const createMeeting = async () => {
    if (!conversationId.trim()) {
      setTestResult("❌ Please enter a conversation ID");
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/zoho-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId.trim(),
          patientName,
          staffName
        })
      });

      const data = await response.json();

      if (response.ok && data.meetingUrl) {
        setMeetingData(data);
        setTestResult("✅ Meeting created successfully!");
        
        // Auto-open the meeting in a new tab
        window.open(data.meetingUrl, '_blank', 'noopener,noreferrer');
      } else {
        setTestResult(`❌ Failed to create meeting: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const joinMeeting = () => {
    if (meetingData?.meetingUrl) {
      window.open(meetingData.meetingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Zoho Meeting Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="conversationId">Conversation ID</Label>
              <Input
                id="conversationId"
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
                placeholder="Enter conversation ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffName">Staff Name</Label>
            <Input
              id="staffName"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Staff name"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={createMeeting}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Create Meeting
            </Button>

            {meetingData && (
              <Button
                onClick={joinMeeting}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Video className="h-4 w-4" />
                Join Meeting
              </Button>
            )}
          </div>

          {testResult && (
            <div className={`p-3 rounded-md text-sm ${
              testResult.startsWith("✅") 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {testResult}
            </div>
          )}

          {meetingData && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-2">Meeting Created!</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Meeting ID:</strong> {meetingData.meetingId}
                </div>
                <div>
                  <strong>Meeting URL:</strong> 
                  <a 
                    href={meetingData.meetingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline ml-1"
                  >
                    {meetingData.meetingUrl}
                  </a>
                </div>
                <div>
                  <strong>Topic:</strong> {meetingData.topic}
                </div>
                <div>
                  <strong>Expires:</strong> {new Date(meetingData.expiresAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">1</span>
              <span>Staff or Patient clicks call button to initiate meeting</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">2</span>
              <span>System creates ONE shared meeting link for the conversation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">3</span>
              <span>Caller automatically joins the Zoho meeting conference</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">4</span>
              <span>Other party receives notification and accepts the call</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">5</span>
              <span>Both parties join the SAME meeting room and wait for each other</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
