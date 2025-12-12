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
import { ArrowLeft, CheckCircle2, Clock, Users, Shield, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Medication Management in Pontiac, MI | Psychiatric & Primary Care Medication Services",
  description:
    "Get professional medication management in Pontiac, MI. Our psychiatric and primary care medication management services ensure safe, effective treatment. Serving Pontiac, Auburn Hills, Waterford Township & nearby areas.",
  alternates: { canonical: `${SITE_URL}/services/medication-management` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Medication management services in Pontiac Michigan including psychiatric medication management and primary care medication coordination.",
  url: `${SITE_URL}/services/medication-management`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "673 Martin Luther King Jr Blvd N",
    addressLocality: "Pontiac",
    addressRegion: "MI",
    postalCode: "48342",
    addressCountry: "US",
  },
  medicalSpecialty: ["Psychiatry", "Primary Care"],
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
      name: "Medication Management",
    },
    {
      "@type": "MedicalProcedure",
      name: "Psychiatric Medication Management",
    },
    {
      "@type": "MedicalProcedure",
      name: "Primary Care Medication Management",
    },
  ],
};

export default function MedicationManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="medication-management-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
              <Badge className="bg-cyan-600 text-white mb-4">Professional Care</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                Medication Management in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Professional Medication Management in Pontiac, Michigan for Safe, Effective Treatment Coordination
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Ensure your medications are properly managed, monitored, and coordinated across all your healthcare providers for optimal treatment outcomes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Schedule Medication Management
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
              Why Choose Our Medication Management in Pontiac, Michigan
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Our medication management services in Pontiac, Michigan provide comprehensive oversight of your medications, ensuring safety, effectiveness, and proper coordination. Whether you need psychiatric medication management or primary care medication coordination, our team ensures you receive the right medications at the right doses.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Licensed Professionals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Psychiatrists and primary care physicians</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Safe Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Regular medication reviews and adjustments</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Coordinated Care</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Communication with all healthcare providers</p>
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

        {/* Psychiatric Medication Management */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Psychiatric Medication Management
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our psychiatric medication management services ensure that mental health medications are properly prescribed, monitored, and adjusted. We work closely with psychiatrists to manage medications for depression, anxiety, bipolar disorder, schizophrenia, and other mental health conditions.
            </p>
            
            <div className="mt-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Psychiatric Medication Management Includes:</h3>
              <ul className="space-y-3 text-lg text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Comprehensive medication evaluation and review</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Medication dosage adjustments and optimization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Side effect monitoring and management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Drug interaction screening</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Regular follow-up appointments</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Primary Care Medication Management */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Primary Care Medication Management
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our primary care medication management services coordinate medications for chronic conditions, general health, and overall wellness. We ensure your medications work together effectively and safely.
            </p>
            
            <div className="mt-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Primary Care Medication Management Includes:</h3>
              <ul className="space-y-3 text-lg text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Medication review and reconciliation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Chronic disease medication management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Coordination with specialists</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Prescription refill management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Medication education and counseling</span>
                </li>
              </ul>
            </div>
            
            <p className="text-gray-600 mt-6">
              Serving patients from Pontiac, Rochester Hills, Bloomfield Hills, Auburn Hills, and nearby communities.
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
                  <CardTitle className="text-xl">Initial Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Comprehensive review of all current medications, medical history, and treatment goals.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    2
                  </div>
                  <CardTitle className="text-xl">Medication Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Development of a personalized medication management plan tailored to your needs.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    3
                  </div>
                  <CardTitle className="text-xl">Ongoing Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Regular follow-up appointments to monitor effectiveness and make adjustments as needed.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-12">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Start Medication Management Today
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
              Real Stories. Real Results.
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
                    "The medication management team helped me find the right balance. My medications are now working effectively with minimal side effects."
                  </p>
                  <p className="font-semibold text-gray-900">— Sarah M., Pontiac, MI</p>
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
                    "The psychiatric medication management service is excellent. They coordinate with all my doctors and ensure everything works together."
                  </p>
                  <p className="font-semibold text-gray-900">— James R., Auburn Hills, MI</p>
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
                    "I finally have all my medications properly managed. The team is professional and truly cares about my health."
                  </p>
                  <p className="font-semibold text-gray-900">— Maria L., Waterford Township, MI</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-b from-cyan-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Start Medication Management Today
            </h2>
            <p className="text-xl mb-8 opacity-95">
              Ensure your medications are properly managed for optimal health and recovery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/intake">
                <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                  Schedule Your Consultation
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
              Medication Management – Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>What is medication management?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Medication management involves comprehensive oversight of your medications to ensure they are safe, effective, and properly coordinated across all healthcare providers.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you offer both psychiatric and primary care medication management?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we offer both psychiatric medication management and primary care medication management services.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>How often do I need medication management appointments?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Frequency depends on your individual needs, but typically ranges from monthly to quarterly appointments.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you coordinate with other healthcare providers?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we coordinate with all your healthcare providers to ensure safe and effective medication management.
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

