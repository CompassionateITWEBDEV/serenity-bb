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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = await login(email, password)
    if (!result.success) {
      setError(result.error ?? "Login failed")
      return
    }
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-5">
            <div className="bg-cyan-100 p-4 rounded-full">
              <Heart className="h-10 w-10 text-cyan-700" />
            </div>
          </div>
          <h1 className="text-4xl font-sans font-extrabold text-slate-900 mb-3">
            Welcome Back
          </h1>
          <p className="text-slate-700 text-lg">
            Sign in to access your recovery journey
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-2">
            {/* ↑ Larger title */}
            <CardTitle className="text-3xl md:text-4xl font-sans text-center">
              Patient Login
            </CardTitle>
            {/* ↑ Larger subtitle */}
            <CardDescription className="text-center text-lg md:text-xl text-slate-700">
              Enter your credentials to continue your treatment
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="text-base">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {error?.includes("offline mode") && (
                <Alert className="border-amber-200 bg-amber-50 text-base">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-amber-700" />
                    <AlertDescription className="text-amber-800">
                      Backend not available. Using demo mode with local authentication.
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base md:text-lg">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base md:text-lg">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-12 text-lg"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="text-base md:text-lg text-cyan-700 hover:text-cyan-800 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-base md:text-lg text-slate-700">
                New patient?{" "}
                <Link
                  href="/signup"
                  className="text-cyan-700 hover:text-cyan-800 font-semibold hover:underline"
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
            className="text-base md:text-lg text-slate-700 hover:text-slate-900 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
