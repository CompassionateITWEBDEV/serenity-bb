"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react"

interface AudioCallProps {
  isIncoming?: boolean
  callerName?: string
  callerRole?: "patient" | "staff"
  onEndCall?: () => void
  onAcceptCall?: () => void
  onRejectCall?: () => void
}

export function AudioCall({
  isIncoming = false,
  callerName = "Unknown",
  callerRole = "patient",
  onEndCall,
  onAcceptCall,
  onRejectCall
}: AudioCallProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [isRinging, setIsRinging] = useState(isIncoming)
  const [audioLevel, setAudioLevel] = useState(0)
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent')
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize audio call
  useEffect(() => {
    if (!isIncoming) {
      startCall()
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isIncoming])

  // Call duration timer
  useEffect(() => {
    if (isConnected) {
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isConnected])

  const startCall = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false 
      })
      streamRef.current = stream
      
      if (audioRef.current) {
        audioRef.current.srcObject = stream
        audioRef.current.play().catch(console.warn)
      }

      // Set up audio level monitoring (simplified)
      try {
        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)
        microphone.connect(analyser)
        analyser.fftSize = 256
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const monitorAudio = () => {
          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average)
          requestAnimationFrame(monitorAudio)
        }
        monitorAudio()
      } catch (error) {
        console.warn("Audio level monitoring not available:", error)
      }
      
      // Simulate connection after 2 seconds
      setTimeout(() => {
        setIsConnected(true)
        setIsRinging(false)
        setConnectionQuality('excellent')
      }, 2000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Microphone access is required for audio calls. Please allow microphone permission and try again.")
    }
  }

  const acceptCall = () => {
    setIsConnected(true)
    setIsRinging(false)
    onAcceptCall?.()
  }

  const rejectCall = () => {
    endCall()
    onRejectCall?.()
  }

  const endCall = () => {
    setIsConnected(false)
    setIsRinging(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    onEndCall?.()
  }

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleSpeaker = () => {
    if (audioRef.current) {
      audioRef.current.muted = isSpeakerOn
      setIsSpeakerOn(!isSpeakerOn)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isIncoming ? "Incoming Call" : "Audio Call"}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant={callerRole === "staff" ? "default" : "secondary"}>
              {callerRole === "staff" ? "Staff" : "Patient"}
            </Badge>
            <span className="text-lg font-medium">{callerName}</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Call Status */}
          <div className="text-center space-y-2">
            {isRinging && (
              <div className="text-cyan-600 font-medium animate-pulse">
                {isIncoming ? "Ringing..." : "Connecting..."}
              </div>
            )}
            {isConnected && (
              <div className="space-y-2">
                <div className="text-green-600 font-medium">
                  Connected - {formatDuration(callDuration)}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionQuality === 'excellent' ? 'bg-green-500' : 
                    connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-600 capitalize">
                    {connectionQuality} connection
                  </span>
                </div>
                {audioLevel > 0 && (
                  <div className="flex items-center justify-center gap-1">
                    <div className="text-xs text-gray-500">Audio Level:</div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-3 rounded ${
                            audioLevel > (i + 1) * 20 ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audio Element */}
          <audio
            ref={audioRef}
            autoPlay
            playsInline
            className="hidden"
          />

          {/* Call Controls */}
          <div className="flex justify-center gap-4">
            {isIncoming && !isConnected && (
              <>
                <Button
                  onClick={rejectCall}
                  size="lg"
                  variant="destructive"
                  className="rounded-full w-16 h-16"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  onClick={acceptCall}
                  size="lg"
                  className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              </>
            )}

            {isConnected && (
              <>
                <Button
                  onClick={toggleMute}
                  size="lg"
                  variant={isMuted ? "destructive" : "outline"}
                  className="rounded-full w-12 h-12"
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                
                <Button
                  onClick={toggleSpeaker}
                  size="lg"
                  variant={isSpeakerOn ? "default" : "outline"}
                  className="rounded-full w-12 h-12"
                >
                  {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
                
                <Button
                  onClick={endCall}
                  size="lg"
                  variant="destructive"
                  className="rounded-full w-16 h-16"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Call Info */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            {isConnected ? (
              <div>
                <p className="font-medium text-green-700">You are now connected!</p>
                <p>Speak clearly and ensure good audio quality for the best experience.</p>
                <div className="mt-2 p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-800">
                    💡 Tip: Use headphones for better audio quality and privacy
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p>This is an audio-only call. Your camera will not be used.</p>
                <p className="text-xs mt-1">Make sure your microphone is working properly.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
