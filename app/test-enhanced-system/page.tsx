"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Video, 
  Phone, 
  Users, 
  Settings,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import Link from "next/link";

export default function TestEnhancedSystemPage() {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runTest = (testName: string, testFn: () => Promise<boolean>) => {
    setTestResults(prev => ({ ...prev, [testName]: false }));
    
    testFn().then(result => {
      setTestResults(prev => ({ ...prev, [testName]: result }));
    }).catch(() => {
      setTestResults(prev => ({ ...prev, [testName]: false }));
    });
  };

  const testWebRTCConnection = async (): Promise<boolean> => {
    try {
      // Test if WebRTC is supported
      if (!window.RTCPeerConnection) {
        throw new Error("WebRTC not supported");
      }
      
      // Test if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }
      
      return true;
    } catch (error) {
      console.error("WebRTC test failed:", error);
      return false;
    }
  };

  const testSupabaseConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/chat/messages/test", { method: "GET" });
      return response.ok;
    } catch (error) {
      console.error("Supabase test failed:", error);
      return false;
    }
  };

  const testVideoCallAPI = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/video-call/invite", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: "test-conversation",
          calleeId: "test-callee",
          callType: "video",
          message: "Test call"
        })
      });
      // We expect this to fail with auth error, but API should be reachable
      return response.status === 401 || response.status === 200;
    } catch (error) {
      console.error("Video call API test failed:", error);
      return false;
    }
  };

  const runAllTests = () => {
    runTest("WebRTC Support", testWebRTCConnection);
    runTest("Supabase Connection", testSupabaseConnection);
    runTest("Video Call API", testVideoCallAPI);
  };

  const getTestIcon = (testName: string) => {
    const result = testResults[testName];
    if (result === undefined) return <Clock className="h-4 w-4 text-gray-400" />;
    if (result) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getTestStatus = (testName: string) => {
    const result = testResults[testName];
    if (result === undefined) return "Pending";
    if (result) return "Passed";
    return "Failed";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Enhanced Messages & Video Call System
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Test the improved messaging system with automatic video call connections
          </p>
        </div>

        {/* System Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Run tests to verify all components are working correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getTestIcon("WebRTC Support")}
                  <span className="font-medium">WebRTC Support</span>
                </div>
                <Badge variant={testResults["WebRTC Support"] ? "default" : "destructive"}>
                  {getTestStatus("WebRTC Support")}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getTestIcon("Supabase Connection")}
                  <span className="font-medium">Supabase Connection</span>
                </div>
                <Badge variant={testResults["Supabase Connection"] ? "default" : "destructive"}>
                  {getTestStatus("Supabase Connection")}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getTestIcon("Video Call API")}
                  <span className="font-medium">Video Call API</span>
                </div>
                <Badge variant={testResults["Video Call API"] ? "default" : "destructive"}>
                  {getTestStatus("Video Call API")}
                </Badge>
              </div>
              
              <Button onClick={runAllTests} className="w-full">
                Run All Tests
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Enhanced Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Enhanced Messages
              </CardTitle>
              <CardDescription>
                Improved messaging interface with real-time updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Real-time message synchronization</li>
                <li>• Enhanced conversation list</li>
                <li>• Improved search functionality</li>
                <li>• Better message formatting</li>
              </ul>
              <Link href="/dashboard/messages-enhanced">
                <Button className="w-full mt-4">
                  Test Enhanced Messages
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Auto-Connecting Video Calls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-green-600" />
                Auto Video Calls
              </CardTitle>
              <CardDescription>
                Video calls that connect automatically with improved reliability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Automatic connection establishment</li>
                <li>• Enhanced error handling</li>
                <li>• Automatic reconnection</li>
                <li>• Improved video quality</li>
              </ul>
              <Link href="/test-video-call-fixed">
                <Button className="w-full mt-4">
                  Test Auto Video Calls
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Integrated System */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Integrated System
              </CardTitle>
              <CardDescription>
                Seamless integration between messaging and video calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• One-click video call initiation</li>
                <li>• Incoming call notifications</li>
                <li>• Call status integration</li>
                <li>• Unified user experience</li>
              </ul>
              <Link href="/call-auto/test-conversation?role=caller&mode=video&peer=test-peer&peerName=Test%20User">
                <Button className="w-full mt-4">
                  Test Integrated System
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Key Improvements */}
        <Card>
          <CardHeader>
            <CardTitle>Key Improvements Made</CardTitle>
            <CardDescription>
              What has been enhanced in the messaging and video call system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-green-600">Messages System</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ Enhanced real-time message synchronization</li>
                  <li>✅ Improved conversation list with search</li>
                  <li>✅ Better message formatting and display</li>
                  <li>✅ Optimized database queries</li>
                  <li>✅ Enhanced error handling</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-3 text-blue-600">WebRTC & Video Calls</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ Automatic connection establishment</li>
                  <li>✅ Enhanced ICE candidate handling</li>
                  <li>✅ Automatic reconnection on failure</li>
                  <li>✅ Improved video stream management</li>
                  <li>✅ Better connection state monitoring</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-3 text-purple-600">User Experience</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ One-click video call initiation</li>
                  <li>✅ Enhanced incoming call notifications</li>
                  <li>✅ Seamless integration between chat and calls</li>
                  <li>✅ Improved loading states and feedback</li>
                  <li>✅ Better error messages and recovery</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-3 text-orange-600">Technical Improvements</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ Simplified connection validation logic</li>
                  <li>✅ Enhanced WebRTC configuration</li>
                  <li>✅ Better state management</li>
                  <li>✅ Improved error boundaries</li>
                  <li>✅ Optimized performance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Test specific features of the enhanced system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/dashboard/messages-enhanced">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <MessageCircle className="h-6 w-6" />
                  <span>Enhanced Messages</span>
                </Button>
              </Link>
              
              <Link href="/test-video-call-fixed">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Video className="h-6 w-6" />
                  <span>Video Call Test</span>
                </Button>
              </Link>
              
              <Link href="/call-auto/test-conversation?role=caller&mode=video&peer=test-peer&peerName=Test%20User">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Phone className="h-6 w-6" />
                  <span>Auto Call Test</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

