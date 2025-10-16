"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { databaseNotificationService } from "@/lib/notifications/database-notifications";
import { Bell, Calendar, MessageSquare, FileText, Users, Video, Plus } from "lucide-react";

export default function TestNotificationsPage() {
  const { patient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [notificationForm, setNotificationForm] = useState({
    type: 'appointment',
    title: '',
    message: '',
    urgent: false
  });

  const createTestNotification = async () => {
    if (!patient?.id) return;

    setLoading(true);
    try {
      const result = await databaseNotificationService.createNotification(
        patient.id,
        notificationForm.type as any,
        notificationForm.title || 'Test Notification',
        notificationForm.message || 'This is a test notification',
        { test: true },
        notificationForm.urgent
      );

      if (result) {
        setMessage('✅ Test notification created successfully!');
        setNotificationForm({
          type: 'appointment',
          title: '',
          message: '',
          urgent: false
        });
      } else {
        setMessage('❌ Failed to create test notification');
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
      setMessage('❌ Error creating test notification');
    } finally {
      setLoading(false);
    }
  };

  const createAppointmentNotification = async () => {
    if (!patient?.id) return;

    setLoading(true);
    try {
      const mockAppointment = {
        id: 'test-apt-1',
        provider_name: 'Dr. Smith',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '10:00 AM',
        type: 'in-person',
        status: 'confirmed'
      };

      const result = await databaseNotificationService.createAppointmentNotification(
        patient.id,
        mockAppointment,
        true // urgent
      );

      if (result) {
        setMessage('✅ Appointment notification created!');
      } else {
        setMessage('❌ Failed to create appointment notification');
      }
    } catch (error) {
      console.error('Error creating appointment notification:', error);
      setMessage('❌ Error creating appointment notification');
    } finally {
      setLoading(false);
    }
  };

  const createChatNotification = async () => {
    if (!patient?.id) return;

    setLoading(true);
    try {
      const mockMessage = {
        id: 'test-msg-1',
        sender_name: 'Dr. Johnson',
        content: 'Hello! I wanted to check in on your progress. How are you feeling today?'
      };

      const result = await databaseNotificationService.createChatNotification(
        patient.id,
        mockMessage
      );

      if (result) {
        setMessage('✅ Chat notification created!');
      } else {
        setMessage('❌ Failed to create chat notification');
      }
    } catch (error) {
      console.error('Error creating chat notification:', error);
      setMessage('❌ Error creating chat notification');
    } finally {
      setLoading(false);
    }
  };

  const createSubmissionNotification = async () => {
    if (!patient?.id) return;

    setLoading(true);
    try {
      const mockSubmission = {
        id: 'test-sub-1',
        title: 'Daily Check-in Video',
        type: 'daily-checkin',
        status: 'processing'
      };

      const result = await databaseNotificationService.createSubmissionNotification(
        patient.id,
        mockSubmission
      );

      if (result) {
        setMessage('✅ Submission notification created!');
      } else {
        setMessage('❌ Failed to create submission notification');
      }
    } catch (error) {
      console.error('Error creating submission notification:', error);
      setMessage('❌ Error creating submission notification');
    } finally {
      setLoading(false);
    }
  };

  const createGroupNotification = async () => {
    if (!patient?.id) return;

    setLoading(true);
    try {
      const mockMessage = {
        id: 'test-group-msg-1',
        sender_name: 'Sarah M.',
        content: 'Great session today everyone! Remember to practice the breathing exercises we discussed.'
      };

      const result = await databaseNotificationService.createGroupNotification(
        patient.id,
        mockMessage,
        'Support Group'
      );

      if (result) {
        setMessage('✅ Group notification created!');
      } else {
        setMessage('❌ Failed to create group notification');
      }
    } catch (error) {
      console.error('Error creating group notification:', error);
      setMessage('❌ Error creating group notification');
    } finally {
      setLoading(false);
    }
  };

  const createGoogleCalendarNotification = async () => {
    if (!patient?.id) return;

    setLoading(true);
    try {
      const mockEvent = {
        id: 'test-google-1',
        summary: 'Therapy Session',
        start: {
          dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        },
        description: 'Weekly therapy session with Dr. Smith'
      };

      const result = await databaseNotificationService.createGoogleCalendarNotification(
        patient.id,
        mockEvent
      );

      if (result) {
        setMessage('✅ Google Calendar notification created!');
      } else {
        setMessage('❌ Failed to create Google Calendar notification');
      }
    } catch (error) {
      console.error('Error creating Google Calendar notification:', error);
      setMessage('❌ Error creating Google Calendar notification');
    } finally {
      setLoading(false);
    }
  };

  if (!patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-gray-500">Please log in to test notifications.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Notifications</h1>
        <p className="text-gray-600">Test the real-time notification system by creating sample notifications.</p>
      </div>

      {message && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-sm">{message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Quick Tests
            </CardTitle>
            <CardDescription>Create sample notifications for different types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={createAppointmentNotification}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Appointment
              </Button>
              
              <Button
                onClick={createChatNotification}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Chat Message
              </Button>
              
              <Button
                onClick={createSubmissionNotification}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Submission
              </Button>
              
              <Button
                onClick={createGroupNotification}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Group Chat
              </Button>
              
              <Button
                onClick={createGoogleCalendarNotification}
                disabled={loading}
                className="flex items-center gap-2 col-span-2"
              >
                <Calendar className="h-4 w-4" />
                Google Calendar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Custom Notification Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Custom Notification
            </CardTitle>
            <CardDescription>Create a custom notification with your own content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={notificationForm.type}
                onValueChange={(value) => setNotificationForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="submission">Submission</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="virtual_appointment">Virtual Appointment</SelectItem>
                  <SelectItem value="google_calendar">Google Calendar</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Notification title"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Notification message"
                value={notificationForm.message}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="urgent"
                checked={notificationForm.urgent}
                onCheckedChange={(checked) => setNotificationForm(prev => ({ ...prev, urgent: checked }))}
              />
              <Label htmlFor="urgent">Mark as urgent</Label>
            </div>

            <Button
              onClick={createTestNotification}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Notification'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Click any of the quick test buttons to create sample notifications</li>
            <li>Check the notification bell icon in the header - it should show the new notifications</li>
            <li>Click on the bell icon to see the notification dropdown</li>
            <li>Visit the <a href="/dashboard/notifications-center" className="text-blue-600 hover:underline">Notifications Center</a> to see all notifications in detail</li>
            <li>Use the custom form to create notifications with your own content</li>
            <li>Notifications are real-time - they should appear immediately without refreshing the page</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
