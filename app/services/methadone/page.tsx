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
import { Shield, ArrowLeft, FileText, CheckCircle2, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Methadone Treatment in Pontiac, MI | Opioid Addiction & Medication-Assisted Care",
  description:
    "Get safe, effective Methadone Treatment in Pontiac, MI. Our Medication-Assisted Treatment and Opioid Addiction Treatment programs provide structured recovery, counseling, and medical support. Serving Pontiac, Auburn Hills, Waterford Township, and nearby areas. Start your recovery today.",
  alternates: { canonical: `${SITE_URL}/services/methadone` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Methadone Treatment and Medication-Assisted Treatment in Pontiac, Michigan.",
  url: `${SITE_URL}/services/methadone`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "673 Martin Luther King Jr Blvd N",
    addressLocality: "Pontiac",
    addressRegion: "MI",
    postalCode: "48342",
    addressCountry: "US",
  },
  medicalSpecialty: "Addiction Treatment",
  areaServed: [
    "Pontiac MI",
    "Auburn Hills MI",
    "Waterford Township MI",
    "Bloomfield Hills MI",
    "Rochester Hills MI",
  ],
  service: [
    {
      "@type": "MedicalTherapy",
      name: "Methadone Treatment",
    },
    {
      "@type": "MedicalTherapy",
      name: "Medication-Assisted Treatment",
    },
    {
      "@type": "MedicalTherapy",
      name: "Opioid Addiction Treatment",
    },
  ],
};

const METHADONE_PDF_ROUTE = "/Methadone-Flyer_compressed.pdf";

export default function MethadoneTreatmentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="methadone-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
              <Badge className="bg-cyan-600 text-white mb-4">Medication-Assisted Treatment</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                Methadone Treatment in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Reclaim your life with safe, structured, and medically supervised Methadone Treatment at Serenity Rehabilitation Center in Pontiac, MI. Our experienced clinicians help individuals break free from opioid addiction with personalized care and long-term recovery support.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Start Recovery Today
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
              Why Our Methadone Treatment Works
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              At Serenity Rehabilitation Center, we provide a comprehensive Methadone Treatment program designed to support long-term recovery and reduce withdrawal symptoms safely. Our team ensures every patient receives personalized care, consistent follow-ups, and a structured recovery path.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Medically Supervised</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Dosing</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Customized Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Treatment plans</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Licensed Specialists</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Addiction specialists</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Private Environment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Judgment-free environment</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Clock className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Local Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">For Pontiac and surrounding areas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Integrated Care</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Therapy & recovery coaching</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center mt-8">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Schedule Your First Consultation
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Compassionate Care Through Medication-Assisted Treatment
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our program uses Medication-Assisted Treatment to help individuals stabilize their lives while reducing opioid cravings. Medication-Assisted Treatment combines methadone with counseling and behavioral therapies, providing a holistic approach to lasting recovery.
            </p>
            
            <div className="mt-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">What to Expect</h3>
              <ul className="space-y-3 text-lg text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Full evaluation by addiction specialists</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Daily or scheduled methadone dosing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Ongoing Medication-Assisted Treatment monitoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Support for residents in Pontiac, Auburn Hills, Waterford Township & beyond</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center mt-8">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Get Started With Medication-Assisted Treatment
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Service Details */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Effective Opioid Addiction Treatment Tailored to You
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our Opioid Addiction Treatment program helps individuals rebuild their lives with structured support and proven clinical methods. We combine Methadone Treatment with behavioral counseling and long-term recovery planning.
            </p>
            
            <div className="mt-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Our Opioid Addiction Treatment Includes:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Methadone dosing and monitoring</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Individual & group counseling</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Behavioral therapy</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Relapse prevention planning</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Family support</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Case management</span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-600 mt-6">
              Serving patients from Pontiac, Rochester Hills, Bloomfield Hills, Auburn Hills, and nearby communities.
            </p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4 text-center">
              What Patients Say About Us
            </h2>
            <p className="text-center text-lg text-gray-600 mb-12">
              Real Stories of Real Recoveries
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
                    "Serenity's Methadone Treatment program changed my life. The staff truly cares and supported me through every step. I feel like myself again."
                  </p>
                  <p className="font-semibold text-gray-900">— Mark T., Pontiac, MI</p>
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
                    "I tried other clinics, but nothing compares to the compassion and structure at Serenity. Their Medication-Assisted Treatment gave me hope."
                  </p>
                  <p className="font-semibold text-gray-900">— Brianna L., Waterford Township, MI</p>
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
                    "Their Opioid Addiction Treatment program is amazing. The team understood my struggles and helped me rebuild my life."
                  </p>
                  <p className="font-semibold text-gray-900">— Chris D., Auburn Hills, MI</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-b from-cyan-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Start Methadone Treatment Today
            </h2>
            <p className="text-xl mb-8 opacity-95">
              Take control of your life with a proven and medically supervised recovery plan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/intake">
                <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                  Begin Recovery Now
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-cyan-800">
                  Call Us Today
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-8 text-center">
              Methadone Treatment – Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>How does Methadone Treatment work?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Methadone Treatment reduces withdrawal symptoms and cravings, allowing individuals to stabilize physically and emotionally.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Is Methadone safe?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, when administered under medical supervision, methadone is a safe, long-term solution for opioid addiction recovery.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do I need an appointment?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes. All patients begin with a full evaluation for safety and treatment planning.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you accept patients from areas outside Pontiac?</CardTitle>
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

