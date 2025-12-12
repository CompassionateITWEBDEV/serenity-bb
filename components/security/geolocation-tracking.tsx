"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { LocationMap } from "@/components/location-map"

interface GeolocationTrackingProps {
  userId: number
  patientId?: number
  showHistory?: boolean
}

interface Location {
  id: number
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  country?: string
  tracking_type: string
  is_verified: boolean
  created_at: string
}

export function GeolocationTracking({
  userId,
  patientId,
  showHistory = true,
}: GeolocationTrackingProps) {
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [locationHistory, setLocationHistory] = useState<Location[]>([])
  const [trackingType, setTrackingType] = useState("check_in")

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }, [])

  const trackLocation = useCallback(async () => {
    try {
      setIsLoading(true)
      const position = await getCurrentPosition()

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
        tracking_type: trackingType,
        patient_id: patientId,
      }

      const response = await apiClient.trackLocation(locationData)
      setCurrentLocation(position)
      toast.success("Location tracked successfully")
      
      // Refresh history
      if (showHistory) {
        loadHistory()
      }
    } catch (error: any) {
      console.error("Tracking error:", error)
      toast.error(error.message || "Failed to track location")
    } finally {
      setIsLoading(false)
    }
  }, [getCurrentPosition, trackingType, patientId, showHistory])

  const loadHistory = useCallback(async () => {
    try {
      const response = await apiClient.getLocationHistory({
        user_id: userId,
        patient_id: patientId,
        limit: 20,
      })
      setLocationHistory(response.locations)
    } catch (error: any) {
      console.error("History error:", error)
      toast.error("Failed to load location history")
    }
  }, [userId, patientId])

  useEffect(() => {
    if (showHistory) {
      loadHistory()
    }
  }, [showHistory, loadHistory])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Tracking
          </CardTitle>
          <CardDescription>Track your current location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentLocation && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Current Location</span>
                </div>
                <p className="text-sm text-gray-600">
                  {currentLocation.coords.latitude.toFixed(6)},{" "}
                  {currentLocation.coords.longitude.toFixed(6)}
                </p>
                {currentLocation.coords.accuracy && (
                  <p className="text-xs text-gray-500">
                    Accuracy: ±{currentLocation.coords.accuracy.toFixed(0)} meters
                  </p>
                )}
              </div>
              
              {/* Map showing the exact location with pin */}
              <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200">
                <LocationMap
                  address={`Your Location (${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)})`}
                  latitude={currentLocation.coords.latitude}
                  longitude={currentLocation.coords.longitude}
                  height="100%"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <select
              value={trackingType}
              onChange={(e) => setTrackingType(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              <option value="check_in">Check-in</option>
              <option value="appointment">Appointment</option>
              <option value="therapy">Therapy Session</option>
              <option value="other">Other</option>
            </select>
            <Button
              onClick={trackLocation}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tracking...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Track Location
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showHistory && locationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Location History
            </CardTitle>
            <CardDescription>Recent location tracking records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {locationHistory.map((location) => (
                <div
                  key={location.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                      </span>
                    </div>
                    {location.is_verified ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {location.city && (
                      <p>
                        {location.city}
                        {location.state && `, ${location.state}`}
                        {location.country && `, ${location.country}`}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {format(new Date(location.created_at), "MMM d, yyyy h:mm a")} •{" "}
                      {location.tracking_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


