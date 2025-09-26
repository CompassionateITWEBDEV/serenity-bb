"use client";

import { useState, type FormEvent } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Clock, AlertCircle } from "lucide-react";
import { getSwal } from "@/lib/sweetalert"; // uses CDN SweetAlert

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const formData = new FormData(e.currentTarget);
    const hasPhone = Boolean((formData.get("phone") as string | null)?.trim());
    const contact_method = hasPhone ? "phone" : "email";

    const data = {
      first_name: (formData.get("firstName") as string || "").trim(),
      last_name: (formData.get("lastName") as string || "").trim(),
      email: (formData.get("email") as string || "").trim(),
      phone: (formData.get("phone") as string || "").trim(),
      subject: (formData.get("subject") as string || "").trim(),
      message: (formData.get("message") as string || "").trim(),
      contact_method,
      source: "contact",
    };

    // Minimal client-side checks (server revalidates)
    if (!data.first_name || !data.last_name || !data.email || !data.message) {
      const Swal = getSwal();
      Swal?.fire({ icon: "warning", title: "Missing fields", text: "First/Last name, email, and message are required." });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Submission failed");
      }

      // GA event (exists only if GA_ID set in layout)
      // @ts-ignore
      window.gtag?.("event", "generate_lead", { form_type: "contact", contact_method });

      const Swal = getSwal();
      Swal?.fire({
        icon: "success",
        title: "Message sent",
        text: "Thanks for reaching out. We’ll contact you shortly.",
        confirmButtonColor: "#06b6d4",
      });

      e.currentTarget.reset();
    } catch (err) {
      const Swal = getSwal();
      Swal?.fire({
        icon: "error",
        title: "Could not send",
        text: err instanceof Error ? err.message : "Please try again.",
      });
      console.error("Failed to submit contact form", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're here to help you take the first step towards recovery. Reach out to us today for confidential support and information.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-serif">Send Us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" name="firstName" placeholder="Enter your first name" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" name="lastName" placeholder="Enter your last name" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" name="email" type="email" placeholder="Enter your email" />
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
                    <Textarea id="message" name="message" placeholder="Tell us how we can help you..." className="min-h-[120px]" />
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
                    <MapPin className="w-6 h-6 text-cyan-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Address</h3>
                      <p className="text-gray-600">123 Recovery St, Pontiac, MI 48341</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Phone className="w-6 h-6 text-cyan-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Phone</h3>
                      <p className="text-gray-600">Main: (248)-838-3686</p>
                      <p className="text-gray-600">Fax: (248)-838-3686</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Mail className="w-6 h-6 text-cyan-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Email</h3>
                      <p className="text-gray-600">info@serenityrehab.com</p>
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
                      <Clock className="w-5 h-5 text-cyan-600" />
                      <div><p className="font-semibold text-gray-900">Monday - Friday</p><p className="text-gray-600">6:00 AM - 5:00 PM</p></div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Clock className="w-5 h-5 text-cyan-600" />
                      <div><p className="font-semibold text-gray-900">Saturday</p><p className="text-gray-600">8:00 AM - 11:00 AM</p></div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Clock className="w-5 h-5 text-cyan-600" />
                      <div><p className="font-semibold text-gray-900">Sunday</p><p className="text-gray-600">Closed</p></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-2">Crisis or Emergency?</h3>
                      <p className="text-red-800 mb-3">
                        If you're experiencing a medical emergency or crisis, please call 911 or go to your nearest emergency room.
                      </p>
                      <p className="text-red-800">
                        For 24/7 crisis support, call our hotline: <strong>(248)-838-3686</strong>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Map placeholder */}
          <div className="mt-16">
            <Card>
              <CardHeader><CardTitle className="text-2xl font-serif">Find Us</CardTitle></CardHeader>
              <CardContent>
                <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Interactive map would be embedded here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
