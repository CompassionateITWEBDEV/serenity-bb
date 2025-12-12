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
import { ArrowLeft, CheckCircle2, Clock, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Psychiatric Evaluation in Pontiac, Michigan | Serenity Rehab",
  description:
    "Get a professional psychiatric evaluation in Pontiac, MI. Accurate diagnosis, fast appointments, and compassionate care. Serving Pontiac & nearby cities.",
  alternates: { canonical: `${SITE_URL}/services/psychiatric-evaluation` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Professional psychiatric evaluation in Pontiac, Michigan. Offering mental health assessments, psychiatric diagnosis and treatment planning. Serving Pontiac and surrounding areas including Auburn Hills, Waterford, Bloomfield Hills, Troy, and Rochester Hills.",
  url: `${SITE_URL}/services/psychiatric-evaluation`,
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
  priceRange: "$$",
  areaServed: [
    "Pontiac MI",
    "Auburn Hills MI",
    "Waterford MI",
    "Bloomfield Hills MI",
    "Troy MI",
    "Rochester Hills MI",
  ],
  service: {
    "@type": "MedicalProcedure",
    name: "Psychiatric Evaluation",
    description: "Licensed psychiatric evaluation in Pontiac Michigan with comprehensive mental health assessment and personalized diagnosis.",
    url: `${SITE_URL}/services/psychiatric-evaluation`,
    provider: {
      "@type": "MedicalClinic",
      name: "Serenity Rehabilitation Center",
    },
    areaServed: [
      "Pontiac MI",
      "Auburn Hills MI",
      "Waterford MI",
      "Bloomfield Hills MI",
      "Troy MI",
      "Rochester Hills MI",
    ],
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "127",
  },
  review: [
    {
      "@type": "Review",
      author: "Olivia R.",
      reviewBody: "The evaluation was thorough and the staff was incredibly supportive. Highly recommended.",
      reviewRating: { "@type": "Rating", ratingValue: "5" },
    },
    {
      "@type": "Review",
      author: "Marcus W.",
      reviewBody: "Professional, accurate, and life-changing experience. The right diagnosis finally helped me move forward.",
      reviewRating: { "@type": "Rating", ratingValue: "5" },
    },
  ],
};

export default function PsychiatricEvaluationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="psychiatric-evaluation-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
                Psychiatric Evaluation in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Professional Psychiatric Evaluation in Pontiac, Michigan for Personalized Mental Health Care
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Get a compassionate, comprehensive mental health assessment from licensed professionals dedicated to your emotional well-being.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Schedule Your Evaluation
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
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
                Why Choose Us for Psychiatric Evaluation in Pontiac, Michigan
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                Our psychiatric evaluation services in Pontiac, Michigan are designed to provide clear diagnosis, accurate treatment planning, and personalized support. Whether you're seeking help for anxiety, depression, mood disorders, addiction concerns, or emotional struggles, our team ensures you receive care with respect and cultural sensitivity.
              </p>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <Card>
                  <CardHeader>
                    <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                    <CardTitle className="text-lg">Licensed & Experienced</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Mental Health Professionals</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                    <CardTitle className="text-lg">Evidence-Based</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Diagnostic Methods</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Users className="w-10 h-10 text-cyan-600 mb-2" />
                    <CardTitle className="text-lg">Confidential & Safe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Judgment-Free Environment</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Clock className="w-10 h-10 text-cyan-600 mb-2" />
                    <CardTitle className="text-lg">Fast Scheduling</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Same Week Appointments Available</p>
                  </CardContent>
                </Card>
              </div>
              
              <p className="text-gray-600 mt-6">
                Serving Pontiac & Surrounding Areas: Auburn Hills, Waterford, Bloomfield, Troy, Rochester
              </p>
            </div>
          </div>
        </section>

        {/* Comprehensive Mental Health Assessment */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Comprehensive Mental Health Assessment in Pontiac
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our mental health assessment in Pontiac provides a full picture of your emotional and psychological needs. During your mental health assessment in Pontiac, our specialists evaluate symptoms, history, behaviors, and biological factors that may impact your well-being.
            </p>
            <p className="text-lg text-gray-700">
              We use advanced screening tools to ensure your mental health assessment in Pontiac is accurate, supportive, and aligned with your long-term recovery plan.
            </p>
          </div>
        </section>

        {/* Psychiatric Diagnosis & Treatment Planning */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Psychiatric Diagnosis & Treatment Planning
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our psychiatric diagnosis process ensures you understand your condition with clarity and confidence. During the psychiatric diagnosis & treatment planning, we explore your symptoms, lifestyle, emotional triggers, and past treatments. Our experts use the psychiatric diagnosis & treatment planning model to create a personalized roadmap designed for long-term stability.
            </p>
            <p className="text-lg text-gray-700">
              With every psychiatric diagnosis & treatment planning, we prioritize accuracy, cultural sensitivity, and evidence-based care.
            </p>
          </div>
        </section>

        {/* About Our Services */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              About Our Psychiatric Evaluation Services
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              At Serenity Rehabilitation Center in Pontiac, we provide psychiatric evaluation services rooted in compassion, respect, and clinical excellence. Our goal is to help individuals understand their mental health challenges and begin the right treatment approach.
            </p>
            <p className="text-lg text-gray-700">
              We proudly serve individuals throughout Pontiac, Auburn Hills, Waterford, Bloomfield Hills, Troy, and nearby Michigan communities.
            </p>
          </div>
        </section>

        {/* Our Process */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-8 text-center">
              Our Process
            </h2>
            <p className="text-center text-lg text-gray-600 mb-12">
              We make your journey simple, supportive, and stress-free.
            </p>
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
                    Meet with our licensed psychiatrist for a detailed discussion about your concerns, symptoms, and needs.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    2
                  </div>
                  <CardTitle className="text-xl">Personalized Diagnosis & Treatment Path</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We match you with the right treatment fit—medication, therapy, case management, or integrated care.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    3
                  </div>
                  <CardTitle className="text-xl">On-Time Completion & Follow-Up</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We ensure your entire evaluation process is completed efficiently, with follow-up sessions scheduled promptly.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-12">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Start Your Evaluation Today
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4 text-center">
              What Our Patients Say
            </h2>
            <p className="text-center text-lg text-gray-600 mb-12">
              Real Experiences. Real Healing.
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
                    "I finally understood what was happening with my anxiety. The evaluation was detailed and the staff made me feel safe. Highly recommended!"
                  </p>
                  <p className="font-semibold text-gray-900">— Olivia R., Troy, MI</p>
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
                    "The team is extremely professional. Their psychiatric evaluation helped me get on the right medication plan. Life-changing experience."
                  </p>
                  <p className="font-semibold text-gray-900">— Marcus W., Pontiac, MI</p>
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
                    "Fast appointments, compassionate team, and truly accurate diagnosis. I'm so grateful I found Serenity Rehabilitation Center."
                  </p>
                  <p className="font-semibold text-gray-900">— Hannah J., Waterford, MI</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-b from-cyan-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Take the first step toward clarity, healing, and emotional stability.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/intake">
                <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                  Book Your Psychiatric Evaluation
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
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>How long does a psychiatric evaluation take?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Usually between 45–90 minutes depending on your symptoms and history.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Who performs the evaluation?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    A licensed psychiatrist with extensive experience in mental health assessment.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you accept insurance?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we work with most insurance plans. Contact us to verify coverage.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Can I get same-week appointments?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Absolutely — we often accommodate same-week and emergency evaluations.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you offer services outside Pontiac?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes! We proudly serve Auburn Hills, Rochester Hills, Troy, Waterford, Bloomfield Hills, and other nearby areas.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        </PageFadeWrapper>
      </main>

      <Footer />
    </div>
  );
}

