"use client";

import React, { useState, type FormEvent, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Clock, AlertCircle } from "lucide-react";
import { getSwal } from "@/lib/sweetalert";

// Lightweight client-only wrapper
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

// Local error boundary to avoid blank screen if map fails
class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any, info: any) { console.error("[/contact] map error", err, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex h-[420px] items-center justify-center rounded-lg border bg-gray-50 text-sm text-gray-700">
          Map unavailable right now. Try again later.
        </div>
      );
    }
    return this.props.children;
  }
}

// Import the map (already client-only inside)
const InteractiveMap = dynamic(() => import("@/components/interactive-map"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full rounded-lg border animate-pulse bg-gray-100" />,
});

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const hasPhone = Boolean((formData.get("phone") as string | null)?.trim());
    const contact_method = hasPhone ? "phone" : "email";

    const data = {
      first_name: ((formData.get("firstName") as string) || "").trim(),
      last_name: ((formData.get("lastName") as string) || "").trim(),
      email: ((formData.get("email") as string) || "").trim(),
      phone: ((formData.get("phone") as string) || "").trim(),
      subject: ((formData.get("subject") as string) || "").trim(),
      message: ((formData.get("message") as string) || "").trim(),
      contact_method,
      source: "contact",
    };

    if (!data.first_name || !data.last_name || !data.email || !data.message) {
      getSwal()?.fire({ icon: "warning", title: "Missing fields", text: "First & last name, email and message are required." });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.text()) || "Submission failed");

      // @ts-ignore optional GA
      window.gtag?.("event", "generate_lead", { form_type: "contact", contact_method });

      getSwal()?.fire({ icon: "success", title: "Message sent", text: "Thanks for reaching out. We’ll contact you shortly.", confirmButtonColor: "#06b6d4" });
      form.reset();
    } catch (err) {
      getSwal()?.fire({ icon: "error", title: "Could not send", text: err instanceof Error ? err.message : "Please try again." });
      console.error("Failed to submit contact form", err);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-serif font-bold text-gray-900">Contact Us</h1>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">
              We're here to help you take the first step towards recovery. Reach out to us today for confidential support and information.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-2">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-serif">Send Us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" name="firstName" required placeholder="Enter your first name" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" name="lastName" required placeholder="Enter your last name" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" name="email" type="email" required placeholder="Enter your email" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="Enter your phone number" />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" placeholder="What can we help you with?" />
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea id="message" name="message" required placeholder="Tell us how we can help you..." className="min-h-[120px]" />
                  </div>
                  <Button disabled={submitting} className="w-full bg-cyan-600 hover:bg-indigo-500">
                    {submitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-2xl font-serif">Get in Touch</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <MapPin className="mt-1 h-6 w-6 text-cyan-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Address</h3>
                      <p className="text-gray-600">35 S Johnson Ave, Pontiac, MI 48341</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Phone className="mt-1 h-6 w-6 text-cyan-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Phone</h3>
                      <p className="text-gray-600">Main: <a className="underline" href="tel:+12488383686">(248) 838-3686</a></p>
                      <p className="text-gray-600">Fax: (248) 838-3686</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Mail className="mt-1 h-6 w-6 text-cyan-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Email</h3>
                      <p className="text-gray-600"><a className="underline" href="mailto:info@serenityrehab.com">info@serenityrehab.com</a></p>
                      <p className="text-gray-600">src.health</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-xl font-serif">Operating Hours</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Monday - Friday</p>
                        <p className="text-gray-600">6:00 AM - 5:00 PM</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Saturday</p>
                        <p className="text-gray-600">8:00 AM - 11:00 AM</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Sunday</p>
                        <p className="text-gray-600">Closed</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="mt-1 h-6 w-6 text-red-600" />
                    <div>
                      <h3 className="mb-2 font-semibold text-red-900">Crisis or Emergency?</h3>
                      <p className="mb-3 text-red-800">If you're experiencing a medical emergency or crisis, call 911 or go to your nearest emergency room.</p>
                      <p className="text-red-800">For 24/7 crisis support, call our hotline: <strong>(248) 838-3686</strong></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Map */}
          <div className="mt-16">
            <Card>
              <CardHeader><CardTitle className="text-2xl font-serif">Find Us</CardTitle></CardHeader>
              <CardContent>
                <ClientOnly>
                  <SectionErrorBoundary>
                    <InteractiveMap
                      address="Martin Luther King Jr Blvd, Pontiac, MI 48341"
                      center={[42.6389, -83.2910]} // MLK Jr Blvd, Pontiac (approx)
                      zoom={15}
                    />
                  </SectionErrorBoundary>
                </ClientOnly>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
