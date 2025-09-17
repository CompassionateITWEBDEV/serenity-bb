// app/signup/page.tsx
'use client';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, UserPlus, AlertTriangle } from 'lucide-react';
// ✅ import the ONE browser singleton
import { supabase } from '@/lib/supabase/client';

type ProblemJson = {
  title?: string;
  detail?: string;
  status?: number;
  fields?: Record<string, string[]>;
};

export default function SignupPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    date_of_birth: '', // yyyy-mm-dd
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    treatment_type: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // ❌ removed useMemo(() => createClient(), [])
  // Always use the imported `supabase` singleton

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFieldErrors((p) => ({ ...p, [field]: [] })); // clear field error on edit
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const backendMissing =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const passwordsMismatch = formData.password !== formData.confirm_password;
  const disableSubmit =
    submitting ||
    !formData.email ||
    !formData.password ||
    passwordsMismatch ||
    formData.password.length < 8;

  const fe = (name: keyof typeof formData) => fieldErrors?.[name]?.[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    if (passwordsMismatch) {
      setFieldErrors((p) => ({ ...p, confirm_password: ['Passwords do not match'] }));
      return;
    }
    if (formData.password.length < 8) {
      setFieldErrors((p) => ({ ...p, password: ['Password must be at least 8 characters'] }));
      return;
    }

    setSubmitting(true);
    try {
      const {
        confirm_password, // strip confirm field from payload
        ...payload
      } = formData;

      const res = await fetch('/api/patients/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body: ProblemJson = await res.json().catch(() => ({} as ProblemJson));
        if (body?.fields) setFieldErrors(body.fields);
        setGeneralError(body?.detail || body?.title || 'Signup failed');
        return;
      }

      // Auto-login newly created user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (signInError) throw signInError;

      // Optional GTAG
      if (typeof window !== 'undefined') {
        const gtag = (window as any).gtag;
        if (typeof gtag === 'function') {
          gtag('event', 'sign_up', { method: 'email' });
        }
      }

      router.push('/dashboard');
    } catch (err: any) {
      setGeneralError(err?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-cyan-100 p-3 rounded-full">
              <UserPlus className="h-8 w-8 text-cyan-600" />
            </div>
          </div>
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Join Serenity</h1>
          <p className="text-gray-600">Start your recovery journey with us today</p>
        </div>

        {/* Show the warning only when env is missing */}
        {backendMissing && (
          <Alert variant="warning" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Development Mode:</strong> Backend not detected. This form requires Supabase env vars.
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-serif text-center">Create Account</CardTitle>
            <CardDescription className="text-center">Fill out the form below to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {generalError && (
                <Alert variant="destructive">
                  <AlertDescription>{generalError}</AlertDescription>
                </Alert>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      placeholder="Enter your first name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      required
                      className="h-11"
                    />
                    {fe('first_name') && <p className="text-xs text-rose-600">{fe('first_name')}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      placeholder="Enter your last name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      required
                      className="h-11"
                    />
                    {fe('last_name') && <p className="text-xs text-rose-600">{fe('last_name')}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="h-11"
                  />
                  {fe('email') && <p className="text-xs text-rose-600">{fe('email')}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      required
                      className="h-11"
                    />
                    {fe('date_of_birth') && <p className="text-xs text-rose-600">{fe('date_of_birth')}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                      className="h-11"
                    />
                    {fe('phone') && <p className="text-xs text-rose-600">{fe('phone')}</p>}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      placeholder="Emergency contact name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                      required
                      className="h-11"
                    />
                    {fe('emergency_contact_name') && (
                      <p className="text-xs text-rose-600">{fe('emergency_contact_name')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                      required
                      className="h-11"
                    />
                    {fe('emergency_contact_phone') && (
                      <p className="text-xs text-rose-600">{fe('emergency_contact_phone')}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                  <Select
                    value={formData.emergency_contact_relationship}
                    onValueChange={(value) => handleInputChange('emergency_contact_relationship', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {fe('emergency_contact_relationship') && (
                    <p className="text-xs text-rose-600">{fe('emergency_contact_relationship')}</p>
                  )}
                </div>
              </div>

              {/* Treatment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Treatment Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="treatment_type">Treatment Program</Label>
                  <Select
                    value={formData.treatment_type}
                    onValueChange={(value) => handleInputChange('treatment_type', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select treatment program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comprehensive Recovery Program">Comprehensive Recovery Program</SelectItem>
                      <SelectItem value="Outpatient Treatment">Outpatient Treatment</SelectItem>
                      <SelectItem value="Methadone Maintenance">Methadone Maintenance</SelectItem>
                      <SelectItem value="Counseling Services">Counseling Services</SelectItem>
                    </SelectContent>
                  </Select>
                  {fe('treatment_type') && <p className="text-xs text-rose-600">{fe('treatment_type')}</p>}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Account Security</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (min 8)</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        required
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fe('password') && <p className="text-xs text-rose-600">{fe('password')}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirm_password}
                        onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                        required
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordsMismatch && (
                      <p className="text-xs text-rose-600">Passwords do not match</p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                disabled={disableSubmit}
                title={
                  formData.password.length < 8
                    ? 'Password must be at least 8 characters'
                    : passwordsMismatch
                    ? 'Passwords do not match'
                    : undefined
                }
              >
                {submitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
