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
import { Shield, ArrowLeft, FileText, CheckCircle2, Users, Clock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "DOT Physicals in Pontiac, MI | Department of Transportation Medical Exams",
  description:
    "Get your DOT physical exam in Pontiac, MI. Certified medical examinations for commercial drivers. Schedule your DOT physical today. Serving Pontiac and surrounding areas.",
  alternates: { canonical: `${SITE_URL}/services/dot-physicals` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "DOT physical examinations in Pontiac, Michigan for commercial drivers. Certified medical exams meeting Department of Transportation requirements.",
  url: `${SITE_URL}/services/dot-physicals`,
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
    name: "DOT Physical Examination",
    description: "Department of Transportation physical examinations for commercial drivers meeting FMCSA requirements.",
    url: `${SITE_URL}/services/dot-physicals`,
    provider: {
      "@type": "MedicalClinic",
      name: "Serenity Rehabilitation Center",
    },
  },
};

export default function DOTPhysicalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="dot-physicals-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
        __html: JSON.stringify(structuredData) }} />
      
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main>
        <PageFadeWrapper>
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-cyan-50 to-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Services</span>
            </Link>

            <div className="text-center mb-12">
              <Badge className="bg-cyan-600 text-white mb-4">Certified Medical Exams</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                DOT Physicals in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Certified Department of Transportation (DOT) physical examinations for commercial drivers. Fast, professional, and compliant with FMCSA requirements.
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Get your DOT physical exam completed quickly and efficiently by our certified medical examiners. We help commercial drivers meet federal requirements and get back on the road.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Schedule DOT Physical
                  </Button>
                </Link>
                <a href="tel:+12488383686">
                  <Button size="lg" variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50">
                    Call Now: (248) 838-3686
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* What is DOT Physical */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              What is a DOT Physical?
            </h2>
            <p className="text-lg text-gray-700 mb-6 max-w-3xl mx-auto text-center">
              A DOT (Department of Transportation) physical is a medical examination required by the Federal Motor Carrier Safety Administration (FMCSA) for commercial drivers. This exam ensures drivers meet the physical and mental health requirements to safely operate commercial vehicles.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Truck className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">FMCSA Certified</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Our certified medical examiners meet all FMCSA requirements for conducting DOT physical examinations.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Fast & Efficient</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Complete your DOT physical quickly with same-day appointments available. Get your medical certificate the same day.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Fully Compliant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">All examinations meet federal DOT requirements and are accepted nationwide for commercial driver licensing.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              What's Included in a DOT Physical
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Physical Examination</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Vision and hearing tests</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Blood pressure and pulse check</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Physical examination</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Urinalysis (if required)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Health Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Medical history review</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Medication review</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Neurological evaluation</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Medical certificate issuance</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Who Needs DOT Physical */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              Who Needs a DOT Physical?
            </h2>
            
            <div className="max-w-3xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-700 mb-4">
                    A DOT physical is required for drivers who operate commercial motor vehicles (CMVs) including:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Commercial drivers with a CDL (Commercial Driver's License)</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Drivers operating vehicles over 10,000 pounds</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Drivers transporting 16+ passengers</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Drivers transporting hazardous materials</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Drivers operating across state lines for commercial purposes</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* What to Bring */}
        <section className="py-16 bg-cyan-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              What to Bring to Your DOT Physical
            </h2>
            
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <FileText className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Valid driver's license</strong> - Current, unexpired driver's license
                    </div>
                  </li>
                  <li className="flex items-start">
                    <FileText className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>List of current medications</strong> - Include dosages and prescribing doctors
                    </div>
                  </li>
                  <li className="flex items-start">
                    <FileText className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Medical records</strong> - If you have diabetes, heart conditions, sleep apnea, or other medical conditions
                    </div>
                  </li>
                  <li className="flex items-start">
                    <FileText className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Eyeglasses or contact lenses</strong> - If you wear corrective lenses
                    </div>
                  </li>
                  <li className="flex items-start">
                    <FileText className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Hearing aids</strong> - If you use hearing assistance devices
                    </div>
                  </li>
                  <li className="flex items-start">
                    <FileText className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Previous DOT medical certificate</strong> - If you have one (for renewal)
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Location & Hours */}
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Ready to Schedule Your DOT Physical?
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              Get your DOT physical exam completed quickly and professionally. Schedule online or call us today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white text-lg px-8">
                  Schedule DOT Physical
                </Button>
              </Link>
              <a href="tel:+12488383686">
                <Button size="lg" variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50 text-lg px-8">
                  Call (248) 838-3686
                </Button>
              </a>
            </div>
          </div>
        </section>
        </PageFadeWrapper>
      </main>

      <Footer />
    </div>
  );
}

