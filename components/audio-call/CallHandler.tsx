"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneOff, Users, Clock } from "lucide-react"
import { AudioCall } from "./AudioCall"

interface CallHandlerProps {
  userRole: "patient" | "staff"
  currentUser: {
    id: string
    name: string
    role: "patient" | "staff"
  }
}

interface CallSession {
  id: string
  patientId: string
  patientName: string
  staffId: string
  staffName: string
  status: "waiting" | "in_progress" | "completed"
  startTime?: Date
  endTime?: Date
}

export function CallHandler({ userRole, currentUser }: CallHandlerProps) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null)
  const [waitingCalls, setWaitingCalls] = useState<CallSession[]>([])
  const [isCalling, setIsCalling] = useState(false)
  const [callHistory, setCallHistory] = useState<CallSession[]>([])

  // Simulate incoming calls for demo
  useEffect(() => {
    const interval = setInterval(() => {
      if (!activeCall && waitingCalls.length === 0 && Math.random() > 0.7) {
        const newCall: CallSession = {
          id: `call_${Date.now()}`,
          patientId: "patient_1",
          patientName: "John Doe",
          staffId: "staff_1", 
          staffName: "Dr. Smith",
          status: "waiting"
        }
        setWaitingCalls(prev => [...prev, newCall])
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [activeCall, waitingCalls.length])

  const initiateCall = async (targetUserId: string, targetUserName: string) => {
    setIsCalling(true)
    
    // Simulate call initiation
    setTimeout(() => {
      const newCall: CallSession = {
        id: `call_${Date.now()}`,
        patientId: userRole === "patient" ? currentUser.id : targetUserId,
        patientName: userRole === "patient" ? currentUser.name : targetUserName,
        staffId: userRole === "staff" ? currentUser.id : targetUserId,
        staffName: userRole === "staff" ? currentUser.name : targetUserName,
        status: "waiting"
      }
      
      setWaitingCalls(prev => [...prev, newCall])
      setIsCalling(false)
    }, 1000)
  }

  const acceptCall = (callId: string) => {
    const call = waitingCalls.find(c => c.id === callId)
    if (call) {
      setActiveCall({
        ...call,
        status: "in_progress",
        startTime: new Date()
      })
      setWaitingCalls(prev => prev.filter(c => c.id !== callId))
    }
  }

  const rejectCall = (callId: string) => {
    const call = waitingCalls.find(c => c.id === callId)
    if (call) {
      setCallHistory(prev => [...prev, { ...call, status: "completed", endTime: new Date() }])
      setWaitingCalls(prev => prev.filter(c => c.id !== callId))
    }
  }

  const endCall = () => {
    if (activeCall) {
      const completedCall = {
        ...activeCall,
        status: "completed" as const,
        endTime: new Date()
      }
      setCallHistory(prev => [completedCall, ...prev])
      setActiveCall(null)
    }
  }

  const getAvailableUsers = () => {
    // Mock data - in real app, this would come from API
    if (userRole === "patient") {
      return [
        { id: "staff_1", name: "Dr. Sarah Smith", role: "staff" as const, available: true, specialty: "General Medicine" },
        { id: "staff_2", name: "Nurse Maria Johnson", role: "staff" as const, available: true, specialty: "Patient Care" },
        { id: "staff_3", name: "Dr. Michael Williams", role: "staff" as const, available: true, specialty: "Mental Health" },
        { id: "staff_4", name: "Dr. Lisa Chen", role: "staff" as const, available: false, specialty: "Emergency Care" }
      ]
    } else {
      return [
        { id: "patient_1", name: "John Doe", role: "patient" as const, available: true, condition: "Recovery Progress" },
        { id: "patient_2", name: "Jane Smith", role: "patient" as const, available: true, condition: "Follow-up Care" },
        { id: "patient_3", name: "Mike Johnson", role: "patient" as const, available: true, condition: "Initial Consultation" },
        { id: "patient_4", name: "Sarah Wilson", role: "patient" as const, available: false, condition: "Scheduled Appointment" }
      ]
    }
  }

  if (activeCall) {
    return (
      <AudioCall
        isIncoming={false}
        callerName={userRole === "patient" ? activeCall.staffName : activeCall.patientName}
        callerRole={userRole === "patient" ? "staff" : "patient"}
        onEndCall={endCall}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Incoming Calls */}
      {waitingCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              Incoming Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waitingCalls.map((call) => (
              <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {userRole === "patient" ? call.staffName : call.patientName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {userRole === "patient" ? "Staff Member" : "Patient"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectCall(call.id)}
                  >
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => acceptCall(call.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Call Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {userRole === "patient" ? "Call Staff" : "Call Patient"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {getAvailableUsers().map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">
                      {userRole === "patient" 
                        ? (user as any).specialty 
                        : (user as any).condition
                      }
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={user.role === "staff" ? "default" : "secondary"} className="text-xs">
                        {user.role === "staff" ? "Staff" : "Patient"}
                      </Badge>
                      <Badge 
                        variant={user.available ? "default" : "secondary"} 
                        className={`text-xs ${user.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {user.available ? "Available" : "Busy"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => initiateCall(user.id, user.name)}
                  disabled={!user.available || isCalling}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                >
                  {isCalling ? "Calling..." : "Call"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Call History */}
      {callHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {callHistory.slice(0, 5).map((call) => (
              <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {userRole === "patient" ? call.staffName : call.patientName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {call.startTime && call.endTime && 
                        `${Math.round((call.endTime.getTime() - call.startTime.getTime()) / 1000 / 60)} min`
                      }
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {call.status === "completed" ? "Completed" : "Missed"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
