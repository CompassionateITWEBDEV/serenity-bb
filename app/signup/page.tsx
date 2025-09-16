import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, UserPlus, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  treatmentProgram?: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelationship: "",
    treatmentProgram: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/patients/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          emergencyName: formData.emergencyName,
          emergencyPhone: formData.emergencyPhone,
          emergencyRelationship: formData.emergencyRelationship,
          treatmentProgram: formData.treatmentProgram,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        // why: surface actual server error to debug quickly
        setError(json?.error || "Database error creating new user");
        return;
      }

      // optional: log the user in immediately with anon client
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (signInErr) {
        // still fine; just route to login
        router.push("/login");
        return;
      }

      router.push("/dashboard/profile");
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-cyan-100 p-3 rounded-full">
              <UserPlus className="h-8 w-8 text-cyan-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="text-gray-600">Join and start your recovery journey.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patient Signup</CardTitle>
            <CardDescription>Fill out your information to create an account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showPwd ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Button type="button" variant="outline" onClick={() => setShowPwd((s) => !s)}>
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input placeholder="YYYY-MM-DD" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Emergency Name</Label>
                  <Input value={formData.emergencyName} onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })} />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input value={formData.emergencyRelationship} onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })} />
                </div>
                <div>
                  <Label>Emergency Phone</Label>
                  <Input value={formData.emergencyPhone} onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Treatment Program</Label>
                <Input value={formData.treatmentProgram} onChange={(e) => setFormData({ ...formData, treatmentProgram: e.target.value })} />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
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
