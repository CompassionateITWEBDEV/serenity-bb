"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, Heart, Shield } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, loading } = useAuth()
  const router = useRouter()

  // ✅ UPDATED LOGIN HANDLER
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = await login(email, password)

    if (!result.success) {
       setError(result.error ?? "Login failed");
      return
    }

    // ✅ Go to dashboard if login succeeds
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-cyan-100 p-5 rounded-full">
              <Heart className="h-12 w-12 text-cyan-600" />
            </div>
          </div>
          <h1 className="text-5xl font-sans font-bold text-gray-900 mb-3">Welcome Back</h1>
          <p className="text-xl text-gray-600">Sign in to access your recovery journey</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-2 pb-8">
            <CardTitle className="text-4xl font-sans text-center">Patient Login</CardTitle>
            <CardDescription className="text-center text-lg">
              Enter your credentials to continue your treatment
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {/* ✅ Use our updated handler */}
            <form onSubmit={onSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="text-base">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {error?.includes("offline mode") && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Shield className="h-5 w-5 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-base">
                    Backend not available. Using demo mode with local authentication.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Label htmlFor="email" className="text-xl font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-16 text-xl"
                />

              <div className="space-y-3">
                <Label htmlFor="password" className="text-lg font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 text-lg pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/forgot-password"
                  className="text-base text-cyan-600 hover:text-cyan-700 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-lg mt-6"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-base text-gray-600">
                New patient?{" "}
                <Link
                  href="/signup"
                  className="text-cyan-600 hover:text-cyan-700 font-semibold hover:underline text-base"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-base text-gray-600 hover:text-gray-800 hover:underline font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
