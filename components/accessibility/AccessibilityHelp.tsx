"use client";

import React, { useState } from 'react';
import { HelpCircle, X, Mic, Video, MessageSquare, Phone, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccessibilityHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const accessibilityScenarios = [
    {
      title: "No Microphone Available",
      icon: <Mic className="h-5 w-5 text-red-500" />,
      solutions: [
        "Use text chat for communication",
        "Send voice notes through chat",
        "Use audio call in listen-only mode",
        "Connect external microphone or headset"
      ]
    },
    {
      title: "No Camera Available", 
      icon: <Video className="h-5 w-5 text-red-500" />,
      solutions: [
        "Switch to audio call mode",
        "Use text chat with voice notes",
        "Connect external camera",
        "Use video call in view-only mode"
      ]
    },
    {
      title: "No Audio/Video Devices",
      icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
      solutions: [
        "Use text chat exclusively",
        "Send voice notes and files",
        "Use phone call as alternative",
        "Request staff assistance"
      ]
    },
    {
      title: "Hearing Difficulties",
      icon: <Volume2 className="h-5 w-5 text-orange-500" />,
      solutions: [
        "Use text chat for all communication",
        "Enable captions if available",
        "Use visual indicators and emojis",
        "Request written summaries"
      ]
    }
  ];

  const communicationMethods = [
    {
      method: "Text Chat",
      description: "Real-time messaging with file sharing",
      icon: <MessageSquare className="h-4 w-4" />,
      alwaysAvailable: true
    },
    {
      method: "Voice Notes",
      description: "Record and send audio messages",
      icon: <Mic className="h-4 w-4" />,
      alwaysAvailable: true
    },
    {
      method: "Phone Call",
      description: "Traditional phone call as backup",
      icon: <Phone className="h-4 w-4" />,
      alwaysAvailable: true
    },
    {
      method: "Video Call",
      description: "Face-to-face video communication",
      icon: <Video className="h-4 w-4" />,
      alwaysAvailable: false
    }
  ];

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Accessibility Help
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Accessibility Help</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Communication Methods */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Available Communication Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {communicationMethods.map((method, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    method.alwaysAvailable 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  {method.icon}
                  <div>
                    <p className="font-medium">{method.method}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {method.description}
                    </p>
                    {method.alwaysAvailable && (
                      <span className="text-xs text-green-600 font-medium">
                        Always Available
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Scenarios */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Device Troubleshooting</h3>
            <div className="space-y-4">
              {accessibilityScenarios.map((scenario, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {scenario.icon}
                    <h4 className="font-medium">{scenario.title}</h4>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {scenario.solutions.map((solution, solIndex) => (
                      <li key={solIndex}>{solution}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">
              Quick Tips
            </h3>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>• Text chat works on any device with internet connection</li>
              <li>• Voice notes can be recorded and sent through chat</li>
              <li>• Staff can always reach you through multiple methods</li>
              <li>• All conversations are saved for your reference</li>
              <li>• You can switch between communication methods anytime</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>
              Got it!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
