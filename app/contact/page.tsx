"use client";

import React, { useState, type FormEvent } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PageFadeWrapper } from "@/components/page-fade-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Clock, AlertCircle } from "lucide-react";
import { getSwal } from "@/lib/sweetalert";
import { LocationMap } from "@/components/location-map";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const hasPhone = Boolean((fd.get("phone") as string | null)?.trim());
    const payload = {
      first_name: ((fd.get("firstName") as string) || "").trim(),
      last_name: ((fd.get("lastName") as string) || "").trim(),
      email: ((fd.get("email") as string) || "").trim(),
      phone: ((fd.get("phone") as string) || "").trim(),
      subject: ((fd.get("subject") as string) || "").trim(),
      message: ((fd.get("message") as string) || "").trim(),
      contact_method: hasPhone ? "phone" : "email",
      source: "contact",
    };

    if (!payload.first_name || !payload.last_name || !payload.email || !payload.message) {
      getSwal()?.fire({
        icon: "warning",
        title: "Missing fields",
        text: "First & last name, email and message are required.",
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Submission failed");

      // @ts-ignore Optional GA
      window.gtag?.("event", "generate_lead", {
        form_type: "contact",
        contact_method: payload.contact_method,
      });

      getSwal()?.fire({
        icon: "success",
        title: "Message sent",
        text: "Thanks for reaching out. We'll contact you shortly.",
        confirmButtonColor: "#06b6d4",
      });
      form?.reset();
    } catch (err) {
      getSwal()?.fire({
        icon: "error",
        title: "Could not send",
        text: err instanceof Error ? err.message : "Please try again.",
      });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-16">
        <PageFadeWrapper>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-serif font-bold text-gray-900">Contact Us</h1>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">
              We're here to help you take the first step towards recovery.
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
                      <Input id="firstName" name="firstName" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" name="lastName" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" type="tel" />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" />
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea id="message" name="message" className="min-h-[120px]" required />
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
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Get in Touch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <MapPin className="mt-1 h-6 w-6 text-cyan-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Address</h3>
                      <p className="text-gray-600">35 S Johnson Ave, Pontiac, MI 48341</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="mt-1 h-6 w-6 text-cyan-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Phone</h3>
                      <p className="text-gray-600">
                        Main: <a className="underline" href="tel:+12488383686">(248) 838-3686</a>
                      </p>
                      <p className="text-gray-600">Fax: (248) 621-9626</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Mail className="mt-1 h-6 w-6 text-cyan-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Email</h3>
                      <p className="text-gray-600">
                        <a className="underline" href="mailto:info@src.health">
                          info@src.health
                        </a>
                      </p>
                      <p className="text-gray-600">src.health</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Operating Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold">Mon–Fri</p>
                        <p className="text-gray-600">9:00 AM – 5:00 PM</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold">Saturday</p>
                        <p className="text-gray-600">By appointment only</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold">Sunday</p>
                        <p className="text-gray-600">By appointment only</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="mt-1 h-6 w-6 text-red-600" />
                    <div>
                      <h3 className="mb-2 font-semibold text-red-900">Crisis or Emergency?</h3>
                      <p className="mb-3 text-red-800">
                        If you're experiencing a medical emergency or crisis, call 911 or go to your nearest emergency room.
                      </p>
                      <p className="text-red-800">
                        24/7 crisis support: <strong><a href="tel:+12488383686" className="underline hover:text-red-600">(248) 838-3686</a></strong>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Accepted Insurance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">In Network</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>• HAP</div>
                        <div>• UHC</div>
                        <div>• AETNA BETTER HEALTH</div>
                        <div>• BCBS</div>
                        <div>• BCBSM</div>
                        <div>• BCN</div>
                        <div>• MCLAREN</div>
                        <div>• AMERIHEALTH CARITAS</div>
                        <div>• CIGNA</div>
                        <div>• MERIDIAN COMPLETE</div>
                        <div>• WELLCARE</div>
                        <div>• PRIORITY HEALTH PLAN</div>
                        <div>• MOLINA</div>
                        <div>• OPTUM VA CCN</div>
                        <div>• AMBETTER</div>
                        <div>• ZING</div>
                        <div>• ZING HEALTH PLAN</div>
                        <div>• NGS</div>
                        <div>• MEDICAID</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Out of Network</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>• HUMANA</div>
                        <div>• AETNA</div>
                        <div>• HAP CARESOURCE</div>
                        <div>• BCC - IN PROCESS</div>
                        <div>• ALIGN SENIOR PLUS</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Map Section */}
          <div className="mt-16">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-serif">Find Us</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-96 w-full">
                  <LocationMap
                    address="35 S Johnson Ave, Pontiac, MI 48341"
                    latitude={42.63471}
                    longitude={-83.30854}
                    height="100%"
                  />
                </div>
                <div className="p-6 pt-4">
                  <p className="text-sm text-gray-600">
                    <strong>Address:</strong> 35 S Johnson Ave, Pontiac, MI 48341
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <a 
                      href="https://www.openstreetmap.org/?mlat=42.63471&mlon=-83.30854&zoom=15"
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:underline"
                    >
                      View on OpenStreetMap →
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </PageFadeWrapper>
      </main>
      <Footer />
    </div>
  );
}
