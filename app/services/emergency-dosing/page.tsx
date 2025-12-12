import { Suspense } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PageFadeWrapper } from "@/components/page-fade-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Phone, Clock, Shield, CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Emergency Dosing in Pontiac, MI | 24/7 Emergency Medication Access",
  description:
    "Emergency dosing services in Pontiac, MI. Schedule emergency medication dosing or call (248) 838-3686 for immediate assistance. Available for patients requiring urgent medication access.",
  alternates: { canonical: `${SITE_URL}/services/emergency-dosing` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Emergency dosing services in Pontiac, Michigan for patients requiring urgent medication access.",
  url: `${SITE_URL}/services/emergency-dosing`,
  image: `${SITE_URL}/og-image.jpg`,
  telephone: "(248) 838-3686",
  address: {
    "@type": "PostalAddress",
    streetAddress: "673 Martin Luther King Jr Blvd N",
    addressLocality: "Pontiac",
    addressRegion: "MI",
    postalCode: "48342",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "42.6420",
    longitude: "-83.2920",
  },
  openingHours: "Mo-Fr 09:00-17:00",
  service: {
    "@type": "MedicalProcedure",
    name: "Emergency Dosing",
    description: "Emergency medication dosing services for patients requiring urgent access to prescribed medications.",
    url: `${SITE_URL}/services/emergency-dosing`,
    provider: {
      "@type": "MedicalClinic",
      name: "Serenity Rehabilitation Center",
    },
  },
};

export default function EmergencyDosingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="emergency-dosing-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
        __html: JSON.stringify(structuredData) }} />
      
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main>
        <PageFadeWrapper>
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-red-50 to-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Services</span>
            </Link>

            <div className="text-center mb-12">
              <Badge className="bg-red-600 text-white mb-4">Emergency Service</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                Emergency Dosing in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Need emergency medication dosing? Schedule an appointment or call us immediately for urgent medication access. We're here to help when you need it most.
              </p>
              
              {/* Emergency CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <a href="tel:+12488383686">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6">
                    <Phone className="w-5 h-5 mr-2" />
                    Call Now: (248) 838-3686
                  </Button>
                </a>
                <Link href="/intake">
                  <Button size="lg" variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50 text-lg px-8 py-6">
                    <Clock className="w-5 h-5 mr-2" />
                    Schedule Emergency Dosing
                  </Button>
                </Link>
              </div>

              {/* Emergency Alert Card */}
              <Card className="border-red-200 bg-red-50 max-w-2xl mx-auto">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="font-semibold text-red-900 mb-2">24/7 Crisis Support Available</h3>
                      <p className="text-red-800 mb-3">
                        If you're experiencing a medical emergency or crisis, call 911 or go to your nearest emergency room immediately.
                      </p>
                      <p className="text-red-800">
                        For emergency dosing needs, call us at <strong><a href="tel:+12488383686" className="underline hover:text-red-600">(248) 838-3686</a></strong>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* What is Emergency Dosing */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              What is Emergency Dosing?
            </h2>
            <p className="text-lg text-gray-700 mb-6 max-w-3xl mx-auto text-center">
              Emergency dosing provides urgent access to prescribed medications when you need them outside of regular scheduled appointments. This service is available for patients who require immediate medication access due to unexpected circumstances, travel, or other urgent situations.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Immediate Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Get urgent medication access when you need it most, with same-day scheduling available.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Medically Supervised</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">All emergency dosing is provided under medical supervision to ensure your safety and proper medication administration.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Licensed Professionals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Our team of licensed healthcare professionals ensures safe and appropriate emergency medication access.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How to Access Emergency Dosing */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              How to Access Emergency Dosing
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="border-2 border-cyan-200">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                    <CardTitle className="text-xl">Call Us Immediately</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">
                    For urgent emergency dosing needs, call us directly at:
                  </p>
                  <a href="tel:+12488383686" className="text-2xl font-bold text-cyan-600 hover:text-cyan-700">
                    (248) 838-3686
                  </a>
                  <p className="text-sm text-gray-600 mt-2">
                    Our staff will assess your situation and arrange for emergency dosing as quickly as possible.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-cyan-200">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
                    <CardTitle className="text-xl">Schedule Online</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">
                    Use our online intake form to schedule emergency dosing:
                  </p>
                  <Link href="/intake">
                    <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                      Schedule Emergency Dosing
                    </Button>
                  </Link>
                  <p className="text-sm text-gray-600 mt-2">
                    Complete the form and our team will contact you promptly to arrange your emergency dosing appointment.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Location & Operating Hours */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">Address</p>
                    <p className="text-gray-700">673 Martin Luther King Jr Blvd N</p>
                    <p className="text-gray-700">Pontiac, MI 48342</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Operating Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold">Monday - Friday</p>
                        <p className="text-gray-600">9:00 AM – 5:00 PM</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold">Saturday & Sunday</p>
                        <p className="text-gray-600">By appointment only</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        <strong>Note:</strong> For emergency dosing outside regular hours, please call our 24/7 crisis support line at <a href="tel:+12488383686" className="text-cyan-600 hover:underline">(248) 838-3686</a>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Important Information */}
        <section className="py-16 bg-cyan-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              Important Information
            </h2>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Who Can Access Emergency Dosing?</h3>
                  <p className="text-gray-700">
                    Emergency dosing is available for current patients who are actively enrolled in our medication-assisted treatment programs. Patients must be in good standing and have a valid prescription on file.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">What to Bring</h3>
                  <p className="text-gray-700 mb-2">When coming for emergency dosing, please bring:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Valid photo identification</li>
                    <li>Insurance card (if applicable)</li>
                    <li>Any relevant medical documentation</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Emergency Situations</h3>
                  <p className="text-gray-700">
                    If you are experiencing a life-threatening medical emergency, please call 911 immediately. For medication-related emergencies or urgent dosing needs, call us at <a href="tel:+12488383686" className="text-cyan-600 hover:underline font-semibold">(248) 838-3686</a>.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Need Emergency Dosing?
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              Don't wait. Call us now or schedule online for immediate assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+12488383686">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white text-lg px-8">
                  <Phone className="w-5 h-5 mr-2" />
                  Call (248) 838-3686
                </Button>
              </a>
              <Link href="/intake">
                <Button size="lg" variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50 text-lg px-8">
                  Schedule Online
                </Button>
              </Link>
            </div>
          </div>
        </section>
        </PageFadeWrapper>
      </main>

      <Footer />
    </div>
  );
}

