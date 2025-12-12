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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Clock, Users, Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Primary Care Services in Pontiac, MI | Comprehensive Healthcare & Medical Services",
  description:
    "Get comprehensive primary care services in Pontiac, MI. Our primary care physicians provide general health services, preventive care, and chronic disease management. Serving Pontiac, Auburn Hills, Waterford Township & nearby areas.",
  alternates: { canonical: `${SITE_URL}/services/primary-care` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Primary care services in Pontiac Michigan including general health services, preventive care, and chronic disease management.",
  url: `${SITE_URL}/services/primary-care`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "673 Martin Luther King Jr Blvd N",
    addressLocality: "Pontiac",
    addressRegion: "MI",
    postalCode: "48342",
    addressCountry: "US",
  },
  medicalSpecialty: "Primary Care",
  areaServed: [
    "Pontiac MI",
    "Auburn Hills MI",
    "Waterford Township MI",
    "Bloomfield Hills MI",
    "Rochester Hills MI",
  ],
  service: [
    {
      "@type": "MedicalProcedure",
      name: "Primary Care Services",
    },
    {
      "@type": "MedicalProcedure",
      name: "General Health Services",
    },
    {
      "@type": "MedicalProcedure",
      name: "Preventive Care",
    },
  ],
};

export default function PrimaryCarePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="primary-care-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
              <Badge className="bg-cyan-600 text-white mb-4">Comprehensive Healthcare</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                Primary Care Services in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Comprehensive Primary Care Services in Pontiac, Michigan for Your Overall Health & Wellness
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Our primary care physicians provide general health services, preventive care, chronic disease management, and coordinated healthcare for individuals and families.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Schedule Primary Care Appointment
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50">
                    Call Now: (248) 838-3686
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Why Choose Our Primary Care Services in Pontiac, Michigan
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Our primary care services in Pontiac, Michigan provide comprehensive healthcare for individuals and families. We offer general health services, preventive care, chronic disease management, and coordination with specialists to ensure you receive the best possible care.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Licensed Physicians</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Board-certified primary care doctors</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Heart className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Preventive Care</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Regular check-ups and health screenings</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Family Care</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Healthcare for all ages</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Clock className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Convenient Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Serving Pontiac and surrounding areas</p>
                </CardContent>
              </Card>
            </div>
            
            <p className="text-gray-600 mt-6">
              Serving Pontiac + Auburn Hills, Waterford, Bloomfield, Troy, Rochester Hills
            </p>
          </div>
        </section>

        {/* Services Offered */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Our Primary Care Services
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our primary care services in Pontiac provide comprehensive healthcare to help you maintain optimal health and manage chronic conditions effectively.
            </p>
            
            <div className="mt-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Primary Care Services Include:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Annual physical examinations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Preventive health screenings</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Chronic disease management</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Acute illness treatment</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Medication management</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Health education and counseling</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Referrals to specialists</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Coordination of care</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Our Services */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              About Our Primary Care Services
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              At Serenity Rehabilitation Center in Pontiac, we provide primary care services that focus on your overall health and wellness. Our primary care physicians work closely with you to prevent illness, manage chronic conditions, and coordinate your healthcare needs.
            </p>
            <p className="text-lg text-gray-700">
              We proudly serve individuals and families throughout Pontiac, Auburn Hills, Waterford, Bloomfield Hills, Troy, and nearby Michigan communities.
            </p>
          </div>
        </section>

        {/* Our Process */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-8 text-center">
              Our Process
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    1
                  </div>
                  <CardTitle className="text-xl">Initial Consultation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Comprehensive health assessment and review of your medical history.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    2
                  </div>
                  <CardTitle className="text-xl">Personalized Care Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Development of a personalized healthcare plan tailored to your needs.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    3
                  </div>
                  <CardTitle className="text-xl">Ongoing Care</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Regular follow-up appointments and continuous health monitoring.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-12">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Schedule Your Primary Care Appointment
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4 text-center">
              What Our Patients Say
            </h2>
            <p className="text-center text-lg text-gray-600 mb-12">
              Real Stories. Real Care.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">⭐</span>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">
                    "The primary care team at Serenity is excellent. They take the time to listen and provide comprehensive care for my whole family."
                  </p>
                  <p className="font-semibold text-gray-900">— Jennifer M., Pontiac, MI</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">⭐</span>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">
                    "I appreciate how they coordinate my care with specialists. The primary care services are thorough and professional."
                  </p>
                  <p className="font-semibold text-gray-900">— Robert K., Auburn Hills, MI</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">⭐</span>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">
                    "The preventive care services helped me catch health issues early. I'm grateful for the comprehensive primary care."
                  </p>
                  <p className="font-semibold text-gray-900">— Lisa P., Waterford Township, MI</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-b from-cyan-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Start Your Primary Care Journey Today
            </h2>
            <p className="text-xl mb-8 opacity-95">
              Take control of your health with comprehensive primary care services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/intake">
                <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                  Schedule Your Appointment
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-cyan-800">
                  Call Us Today: (248) 838-3686
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-8 text-center">
              Primary Care Services – Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>What primary care services do you offer?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We offer comprehensive primary care including annual physicals, preventive screenings, chronic disease management, acute illness treatment, and medication management.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you accept insurance?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we accept most major insurance plans. Contact us to verify your coverage.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Can I get same-day appointments?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We offer same-day appointments for urgent care needs when available.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you coordinate with specialists?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we coordinate care with specialists and ensure all your healthcare providers work together.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you serve areas outside Pontiac?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes! We serve residents from Pontiac, Auburn Hills, Waterford Township, Rochester Hills, and surrounding cities.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        </PageFadeWrapper>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

