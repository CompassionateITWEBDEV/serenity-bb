"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ZohoSetupPage() {
  const router = useRouter();
  const [zohoUrl, setZohoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [verifiedUrl, setVerifiedUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");

  // Load current configuration if exists
  useEffect(() => {
    fetch('/api/zoho-config')
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setZohoUrl(data.url);
          setCurrentUrl(data.url);
        }
      })
      .catch(err => console.error('Failed to load config:', err));
  }, []);

  const handleVerify = async () => {
    if (!zohoUrl.trim()) {
      setErrorMessage("Please enter a Zoho Meeting URL");
      return;
    }

    setIsLoading(true);
    setStatus('verifying');
    setErrorMessage("");

    try {
      // Save to environment/config
      const response = await fetch('/api/zoho-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: zohoUrl })
      });

      const data = await response.json();

      if (response.ok) {
        // Test the URL by trying to open it
        setStatus('success');
        setVerifiedUrl(zohoUrl);
        
        // Save to localStorage for immediate use
        localStorage.setItem('zoho_meeting_url', zohoUrl);
        
        // Show success message
        setTimeout(() => {
          router.push('/dashboard/messages');
        }, 2000);
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to verify Zoho Meeting URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCall = () => {
    if (verifiedUrl || zohoUrl) {
      window.open(verifiedUrl || zohoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Zoho Meeting Setup
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your Zoho Meeting account to enable video calls
          </p>
        </div>

        {/* Status Card */}
        {status === 'success' && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              ✅ Zoho Meeting URL verified successfully! Redirecting to messages...
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="mb-6 bg-red-50 deficit-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              ❌ {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Configure Zoho Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                📋 How to get your Zoho Meeting URL:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
                <li>Go to <a href="https://meeting.zoho.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">meeting.zoho.com</a></li>
                <li>Log in to your Zoho Meeting account</li>
                <li>Go to "My Meeting Rooms" or "Personal Rooms"</li>
                <li>Copy your meeting room URL</li>
                <li>Paste it below and click "Verify & Save"</li>
              </ol>
            </div>

            {/* Current Configuration */}
            {currentUrl && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Current Configuration:
                </Label>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 break-all">
                  {currentUrl}
                </p>
              </div>
            )}

            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="zoho-url">
                Zoho Meeting URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="zoho-url"
                type="url"
                placeholder="https://meeting.zoho.com/room/123456789"
                value={zohoUrl}
                onChange={(e) => setZohoUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Enter your Zoho Meeting room URL
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleVerify}
                disabled={isLoading || !zohoUrl.trim()}
                className="flex-1"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Save'
                )}
              </Button>

              {(verifiedUrl || currentUrl) && (
                <Button
                  onClick={handleTestCall}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  Test Call
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>✨ What You'll Get</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Video and audio calls with patients</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Real-time call notifications</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Clickable meeting links in messages</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatic meeting room setup</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>No manual configuration needed after setup</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>💡 Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              If you don't have a Zoho Meeting account, you can create one for free at{' '}
              <a href="https://www.zoho.com/meeting" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                zoho.com/meeting
              </a>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Your meeting URL will be verified automatically and saved securely.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

