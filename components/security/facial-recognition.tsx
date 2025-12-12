"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, CheckCircle2, XCircle, Loader2, User, Shield } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface FacialRecognitionProps {
  userId: number
  patientId?: number
  mode?: "register" | "verify"
}

export function FacialRecognition({ userId, patientId, mode = "verify" }: FacialRecognitionProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{
    verified?: boolean
    confidence?: number
    message?: string
  } | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    return canvas.toDataURL("image/jpeg", 0.8)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("Could not access camera. Please check permissions.")
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const handleCapture = useCallback(async () => {
    const imageData = await captureImage()
    if (!imageData) {
      toast.error("Failed to capture image")
      return
    }

    setImagePreview(imageData)
    stopCamera()
  }, [captureImage, stopCamera])

  const handleRegister = useCallback(async () => {
    if (!imagePreview) {
      toast.error("Please capture an image first")
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      const response = await apiClient.registerFace(userId, imagePreview, patientId)
      setResult({
        verified: true,
        confidence: response.confidence_score || 1.0,
        message: "Face registered successfully",
      })
      toast.success("Face registered successfully")
    } catch (error: any) {
      console.error("Registration error:", error)
      setResult({
        verified: false,
        confidence: 0,
        message: error.message || "Failed to register face",
      })
      toast.error(error.message || "Failed to register face")
    } finally {
      setIsProcessing(false)
    }
  }, [imagePreview, userId, patientId])

  const handleVerify = useCallback(async () => {
    if (!imagePreview) {
      toast.error("Please capture an image first")
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      const response = await apiClient.verifyFace(imagePreview, userId, patientId)
      setResult({
        verified: response.verified,
        confidence: response.confidence,
        message: response.message,
      })
      if (response.verified) {
        toast.success(`Face verified! Confidence: ${(response.confidence * 100).toFixed(1)}%`)
      } else {
        toast.error("Face verification failed")
      }
    } catch (error: any) {
      console.error("Verification error:", error)
      setResult({
        verified: false,
        confidence: 0,
        message: error.message || "Failed to verify face",
      })
      toast.error(error.message || "Failed to verify face")
    } finally {
      setIsProcessing(false)
    }
  }, [imagePreview, userId, patientId])

  const handleReset = useCallback(() => {
    setImagePreview(null)
    setResult(null)
    stopCamera()
  }, [stopCamera])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {mode === "register" ? "Register Face" : "Face Verification"}
        </CardTitle>
        <CardDescription>
          {mode === "register"
            ? "Capture your face to register it for verification"
            : "Capture your face to verify your identity"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!imagePreview ? (
          <div className="space-y-4">
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2">
              <Button onClick={startCamera} variant="outline" className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
              <Button onClick={handleCapture} variant="default" className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={imagePreview}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            </div>
            {result && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  result.verified
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {result.verified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{result.message}</p>
                  {result.confidence !== undefined && (
                    <p className="text-sm text-gray-600">
                      Confidence: {(result.confidence * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={mode === "register" ? handleRegister : handleVerify}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {mode === "register" ? (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        Register Face
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Verify Face
                      </>
                    )}
                  </>
                )}
              </Button>
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Retake
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


