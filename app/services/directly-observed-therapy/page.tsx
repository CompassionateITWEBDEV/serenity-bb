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
import { Shield, ArrowLeft, CheckCircle2, Clock, Eye, Pill, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Directly Observed Therapy (DOT) in Pontiac, MI | Medication Compliance Monitoring",
  description:
    "Directly Observed Therapy (DOT) services in Pontiac, MI. Professional medication compliance monitoring for substance use treatment. Ensure proper medication adherence with supervised dosing.",
  alternates: { canonical: `${SITE_URL}/services/directly-observed-therapy` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Directly Observed Therapy (DOT) services in Pontiac, Michigan. Professional medication compliance monitoring for substance use treatment programs.",
  url: `${SITE_URL}/services/directly-observed-therapy`,
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
    name: "Directly Observed Therapy",
    description: "Medication compliance monitoring through directly observed therapy for substance use treatment programs.",
    url: `${SITE_URL}/services/directly-observed-therapy`,
    provider: {
      "@type": "MedicalClinic",
      name: "Serenity Rehabilitation Center",
    },
  },
};

export default function DirectlyObservedTherapyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="directly-observed-therapy-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
              <Badge className="bg-cyan-600 text-white mb-4">Medication Compliance</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                Directly Observed Therapy (DOT) in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Professional medication compliance monitoring through Directly Observed Therapy. Ensure proper medication adherence with supervised dosing for substance use treatment programs.
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Our Directly Observed Therapy program provides supervised medication administration to ensure treatment compliance and improve outcomes in medication-assisted treatment programs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Schedule DOT Service
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

        {/* What is Directly Observed Therapy */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              What is Directly Observed Therapy (DOT)?
            </h2>
            <p className="text-lg text-gray-700 mb-6 max-w-3xl mx-auto text-center">
              Directly Observed Therapy (DOT) is a treatment method where a healthcare professional directly observes a patient taking their medication. This ensures medication compliance, reduces the risk of misuse, and improves treatment outcomes in substance use treatment programs.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Eye className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Supervised Dosing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">A healthcare professional directly observes and verifies that medication is taken as prescribed, ensuring proper adherence to treatment protocols.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Improved Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">DOT significantly improves medication compliance rates, reducing the risk of missed doses and treatment interruptions.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Better Outcomes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Studies show that directly observed therapy leads to better treatment outcomes and reduced risk of relapse in substance use treatment.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              Benefits of Directly Observed Therapy
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">For Patients</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Ensures proper medication adherence</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Reduces risk of medication misuse or diversion</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Provides accountability and support</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Improves treatment outcomes and recovery success</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Regular monitoring and support from healthcare staff</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">For Treatment Programs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Verifies medication compliance</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Prevents medication diversion</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Meets regulatory requirements for certain medications</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Provides documentation of medication administration</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Enhances overall program effectiveness</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* When is DOT Used */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              When is Directly Observed Therapy Used?
            </h2>
            
            <div className="max-w-3xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-700 mb-4">
                    Directly Observed Therapy is commonly used in medication-assisted treatment programs, particularly for:
                  </p>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <Pill className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Methadone Treatment</strong> - Daily supervised dosing of methadone for opioid use disorder treatment
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Pill className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Suboxone Treatment</strong> - Supervised administration of Suboxone (buprenorphine/naloxone) when required
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Pill className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Naltrexone Treatment</strong> - Supervised dosing of naltrexone for alcohol and opioid use disorder
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Pill className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Antabuse Treatment</strong> - Supervised administration of disulfiram for alcohol use disorder
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Pill className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>High-Risk Patients</strong> - Patients with history of non-compliance or medication diversion
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Pill className="w-5 h-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Regulatory Requirements</strong> - When required by treatment protocols or court orders
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-cyan-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 text-center">
              How Directly Observed Therapy Works
            </h2>
            
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Patient Arrival</h3>
                      <p className="text-gray-700">Patient arrives at the clinic at their scheduled time for medication administration.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Medication Preparation</h3>
                      <p className="text-gray-700">Healthcare professional prepares the prescribed medication according to the treatment plan.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Direct Observation</h3>
                      <p className="text-gray-700">Healthcare professional directly observes the patient taking the medication, ensuring it is swallowed completely.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Documentation</h3>
                      <p className="text-gray-700">The medication administration is documented in the patient's medical record, including date, time, and medication details.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                      5
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Monitoring</h3>
                      <p className="text-gray-700">Patient may be monitored briefly after medication administration to ensure no adverse reactions occur.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
              Ready to Start Directly Observed Therapy?
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              Ensure medication compliance and improve treatment outcomes with our Directly Observed Therapy program. Schedule an appointment today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white text-lg px-8">
                  Schedule DOT Service
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

