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
import { CheckCircle2, Heart, Shield, ArrowLeft, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Counseling Services in Pontiac Michigan | Mental Health & Behavioral Therapy",
  description:
    "Professional counseling services in Pontiac Michigan for anxiety, depression, trauma, and behavioral health therapy. Compassionate mental health counseling serving Pontiac, Auburn Hills, Waterford, Troy & nearby areas. Start healing today.",
  alternates: { canonical: `${SITE_URL}/services/counseling` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Professional counseling services in Pontiac Michigan offering mental health counseling, behavioral health therapy services, trauma support, addiction counseling, and emotional wellness programs.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "673 Martin Luther King Jr Blvd N",
    addressLocality: "Pontiac",
    addressRegion: "MI",
    postalCode: "48342",
    addressCountry: "US",
  },
  telephone: "(248) 838-3686",
  url: `${SITE_URL}/services/counseling`,
  image: `${SITE_URL}/og-image.jpg`,
  geo: {
    "@type": "GeoCoordinates",
    latitude: "42.6420",
    longitude: "-83.2920",
  },
  service: {
    "@type": "MedicalTherapy",
    name: "Counseling Services",
    areaServed: [
      "Pontiac MI",
      "Auburn Hills MI",
      "Waterford Township MI",
      "Troy MI",
      "Bloomfield Hills MI",
      "Rochester Hills MI",
    ],
    serviceType: [
      "Mental Health Counseling in Pontiac",
      "Behavioral Health Therapy Services",
      "Trauma Counseling",
      "Addiction Counseling",
    ],
  },
};

export default function CounselingServicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="counseling-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
              <Badge className="bg-cyan-600 text-white mb-4">Professional Counseling</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                Counseling Services in Pontiac Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Compassionate Counseling Services in Pontiac Michigan for Lasting Emotional Wellness
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Professional, confidential, and personalized counseling to support your mental, emotional, and behavioral health journey.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Schedule a Counseling Session
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50">
                    Call Today: (248) 838-3686
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
              Why Choose Us for Counseling Services in Pontiac Michigan
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Serenity Rehabilitation Center delivers counseling services in Pontiac Michigan designed to empower individuals through evidence-based therapy, personalized care plans, and a warm, judgment-free environment. We proudly support adults, teens, and families across Pontiac and surrounding communities.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Certified & Trained</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Mental health counselors</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Evidence-Based</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Counseling approaches</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Heart className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Trauma-Informed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Culturally sensitive environment</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Comprehensive Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">For depression, anxiety, addiction, trauma & more</p>
                </CardContent>
              </Card>
            </div>
            
            <p className="text-gray-600 mt-6">
              Serving Pontiac, Auburn Hills, Waterford Township, Troy, Bloomfield Hills & Rochester Hills
            </p>
          </div>
        </section>

        {/* Mental Health Counseling */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Mental Health Counseling in Pontiac
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our mental health counseling in Pontiac focuses on helping individuals overcome emotional challenges, build resilience, and improve daily functioning. With mental health counseling in Pontiac, clients receive personalized care tailored to their specific needs, from anxiety and depression to trauma recovery.
            </p>
            <p className="text-lg text-gray-700">
              Our licensed professionals ensure mental health counseling in Pontiac is supportive, confidential, and transformative.
            </p>
          </div>
        </section>

        {/* Behavioral Health Therapy */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Behavioral Health Therapy Services
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our behavioral health therapy services are designed to address patterns, habits, and emotional responses that may impact your well-being. Through our behavioral health therapy services, clients gain coping strategies, emotional regulation tools, and lifestyle adjustments that support long-term stability.
            </p>
            <p className="text-lg text-gray-700">
              Our team integrates CBT, DBT, solution-focused therapy, and motivational interviewing into our behavioral health therapy services.
            </p>
          </div>
        </section>

        {/* About Our Services */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              About Our Counseling Services
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              At Serenity Rehabilitation Center, we deeply understand the courage it takes to ask for help. Our counseling programs combine professional care with compassionate understanding, ensuring every person receives support tailored to their journey.
            </p>
            <p className="text-lg text-gray-700">
              We proudly serve: Pontiac, Auburn Hills, Waterford, Bloomfield Hills, Troy, Rochester Hills, and surrounding Michigan communities.
            </p>
          </div>
        </section>

        {/* Our Process */}
        <section className="py-16">
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
                  <CardTitle className="text-xl">Expert Consultation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Our counselor evaluates your needs, symptoms, history, and goals during a compassionate one-on-one session.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    2
                  </div>
                  <CardTitle className="text-xl">Personalized Counseling Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We match you with the right counseling approach—CBT, DBT, trauma counseling, addiction counseling, or integrative therapy.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    3
                  </div>
                  <CardTitle className="text-xl">On-Time & Structured Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Sessions are scheduled consistently and conducted with professionalism, empathy, and priority for your progress.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-12">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Start Your Counseling Today
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4 text-center">
              What Our Clients Say
            </h2>
            <p className="text-center text-lg text-gray-600 mb-12">
              Real Stories of Healing & Transformation
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
                    "Counseling here changed my life. I finally feel seen, heard, and understood. Highly recommended!"
                  </p>
                  <p className="font-semibold text-gray-900">— Jason T., Auburn Hills, MI</p>
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
                    "The therapist was incredibly supportive. I felt comfortable from day one. My anxiety has drastically improved."
                  </p>
                  <p className="font-semibold text-gray-900">— Elisa M., Pontiac, MI</p>
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
                    "Professional, caring, and very effective counseling services. I regained control of my life."
                  </p>
                  <p className="font-semibold text-gray-900">— Lawrence P., Waterford Township, MI</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-b from-cyan-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Take the first step toward emotional clarity and long-term healing.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/intake">
                <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                  Book a Counseling Session
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-cyan-800">
                  Call Us Now: (248) 838-3686
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>How long is a counseling session?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Typically 45–60 minutes depending on your treatment plan.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you accept insurance?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we accept most major insurance plans.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you offer virtual counseling?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes — telehealth counseling is available.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Is counseling confidential?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Absolutely. All sessions follow strict confidentiality laws.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you serve areas outside Pontiac?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes — Troy, Auburn Hills, Waterford, Bloomfield Hills & all nearby communities.
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
