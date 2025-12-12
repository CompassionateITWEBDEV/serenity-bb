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
  title: "Naltrexone & Antabuse Treatment in Pontiac, MI | Medication-Assisted Recovery",
  description:
    "Get safe, effective Naltrexone and Antabuse treatment in Pontiac, MI. Our medication-assisted treatment programs provide structured recovery for alcohol and opioid addiction. Serving Pontiac, Auburn Hills, Waterford Township & nearby areas.",
  alternates: { canonical: `${SITE_URL}/services/naltrexone-antabuse` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Naltrexone and Antabuse treatment in Pontiac, Michigan for alcohol and opioid addiction recovery.",
  url: `${SITE_URL}/services/naltrexone-antabuse`,
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
      name: "Naltrexone Treatment",
    },
    {
      "@type": "MedicalTherapy",
      name: "Antabuse Treatment",
    },
    {
      "@type": "MedicalTherapy",
      name: "Medication-Assisted Treatment",
    },
  ],
};

export default function NaltrexoneAntabusePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="naltrexone-antabuse-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
                Naltrexone & Antabuse Treatment in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Reclaim your life with safe, effective Naltrexone and Antabuse treatment at Serenity Rehabilitation Center in Pontiac, MI. Our experienced clinicians help individuals break free from alcohol and opioid addiction with personalized care and long-term recovery support.
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
              Why Our Naltrexone & Antabuse Treatment Works
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              At Serenity Rehabilitation Center, we provide comprehensive Naltrexone and Antabuse treatment programs designed to support long-term recovery and prevent relapse. Our team ensures every patient receives personalized care, consistent follow-ups, and a structured recovery path.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Medically Supervised</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Medication dosing and monitoring</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Customized Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Personalized treatment plans</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Licensed Specialists</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Addiction treatment specialists</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Pill className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Naltrexone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">For opioid and alcohol addiction</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Pill className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Antabuse</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">For alcohol addiction recovery</p>
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

        {/* Naltrexone Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Naltrexone Treatment for Opioid & Alcohol Addiction
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Naltrexone is an effective medication-assisted treatment option for both opioid and alcohol addiction. It works by blocking the effects of opioids and reducing alcohol cravings, helping individuals maintain sobriety while working on their recovery.
            </p>
            
            <div className="mt-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Naltrexone Treatment Includes:</h3>
              <ul className="space-y-3 text-lg text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Comprehensive evaluation by addiction specialists</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Naltrexone medication management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Ongoing monitoring and support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Counseling and behavioral therapy</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Antabuse Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Antabuse Treatment for Alcohol Addiction
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Antabuse (disulfiram) is a medication that helps individuals maintain sobriety from alcohol by creating an unpleasant reaction if alcohol is consumed. This medication-assisted treatment provides an additional layer of support for those committed to alcohol addiction recovery.
            </p>
            
            <div className="mt-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Antabuse Treatment Includes:</h3>
              <ul className="space-y-3 text-lg text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Full medical evaluation and assessment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Antabuse medication management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Regular monitoring and follow-up care</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 mt-1 flex-shrink-0" />
                  <span>Counseling and relapse prevention support</span>
                </li>
              </ul>
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
                    "Serenity's Naltrexone treatment helped me stay sober. The staff truly cares and supported me through every step."
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
                    "Antabuse treatment gave me the extra support I needed. The team at Serenity is compassionate and professional."
                  </p>
                  <p className="font-semibold text-gray-900">— Sarah L., Waterford Township, MI</p>
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
                    "The medication-assisted treatment program is amazing. I finally feel in control of my recovery."
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
              Start Naltrexone or Antabuse Treatment Today
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
              Naltrexone & Antabuse Treatment – Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>How does Naltrexone work?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Naltrexone blocks the effects of opioids and reduces alcohol cravings, helping individuals maintain sobriety during recovery.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>How does Antabuse work?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Antabuse creates an unpleasant reaction if alcohol is consumed, providing an additional deterrent to help maintain sobriety.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Are these medications safe?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, when administered under medical supervision, both Naltrexone and Antabuse are safe, FDA-approved solutions for addiction recovery.
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

