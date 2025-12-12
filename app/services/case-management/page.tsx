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
import { ArrowLeft, CheckCircle2, Clock, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Case Management in Pontiac Michigan | Behavioral & Medical Case Management Services",
  description:
    "Get professional case management in Pontiac Michigan, including behavioral case management services and medical case management support. Serving Auburn Hills, Waterford, Troy, Bloomfield Hills & nearby areas. Start your coordinated care today.",
  alternates: { canonical: `${SITE_URL}/services/case-management` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Professional case management in Pontiac Michigan, including behavioral case management and medical case management services. Serving Pontiac, Auburn Hills, Waterford, Bloomfield Hills, Troy, and Rochester Hills.",
  url: `${SITE_URL}/services/case-management`,
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
  service: [
    {
      "@type": "MedicalProcedure",
      name: "Case Management in Pontiac Michigan",
      description: "Comprehensive case management services including mental, behavioral, and medical support in Pontiac MI.",
    },
    {
      "@type": "MedicalProcedure",
      name: "Behavioral Case Management Services",
      description: "Behavioral case management services for mental health support in Pontiac MI.",
    },
    {
      "@type": "MedicalProcedure",
      name: "Medical Case Management in Pontiac",
      description: "Medical case management including appointment coordination, medication support, and healthcare navigation.",
    },
  ],
  areaServed: [
    "Pontiac MI",
    "Auburn Hills MI",
    "Waterford MI",
    "Bloomfield Hills MI",
    "Troy MI",
    "Rochester Hills MI",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "114",
  },
};

export default function CaseManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="case-management-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
              <Badge className="bg-cyan-600 text-white mb-4">Coordinated Care</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                Case Management in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Professional Case Management in Pontiac, Michigan for Complete Mental & Medical Support
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Your journey to recovery becomes easier with coordinated care, personalized support, and compassionate guidance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Start Case Management Today
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
              Why Choose Our Case Management in Pontiac, Michigan
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Our case management in Pontiac, Michigan provides structured, individualized support for clients navigating mental health challenges, medical needs, and social resources. We coordinate everything—from psychiatry visits to medical appointments—to ensure smooth recovery. With our case management in Pontiac, Michigan, clients receive dependable, culturally sensitive, and continuous care.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Coordinated Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Behavioral & medical support</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">One-on-One Guidance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">From qualified case managers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Resource Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Social services & community programs</p>
                </CardContent>
              </Card>
            </div>
            
            <p className="text-gray-600 mt-6">
              Serving Pontiac + Auburn Hills, Waterford, Bloomfield, Troy, Rochester Hills
            </p>
          </div>
        </section>

        {/* Behavioral Case Management */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Behavioral Case Management Services
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our behavioral case management services help clients manage psychological, emotional, and social challenges. Whether you're dealing with depression, anxiety, trauma, or addiction, our behavioral case management services ensure you stay connected with the right therapists, psychiatrists, and support groups.
            </p>
            <p className="text-lg text-gray-700">
              We assist with scheduling, follow-ups, treatment planning, and consistent monitoring throughout your journey. With behavioral case management services, you receive structured support tailored to your long-term mental health goals.
            </p>
          </div>
        </section>

        {/* Medical Case Management */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Medical Case Management in Pontiac
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our medical case management in Pontiac connects you with essential medical services, medication coordination, and healthcare appointments. Through medical case management in Pontiac, we support individuals dealing with chronic illnesses, mental health-related medical needs, or addiction treatment requirements.
            </p>
            <p className="text-lg text-gray-700">
              Each client receives a personalized plan through our medical case management in Pontiac to ensure they stay on track with their treatment, medications, and health goals.
            </p>
          </div>
        </section>

        {/* About Our Team */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              About Our Case Management Team
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              At Serenity Rehabilitation Center, our case managers work closely with patients to bridge the gap between mental health care, medical care, and community resources.
            </p>
            <p className="text-lg text-gray-700">
              We proudly support clients throughout Pontiac, Auburn Hills, Waterford, Bloomfield Hills, Troy, and Rochester Hills.
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
                    We begin by understanding your mental, medical, and social needs.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    2
                  </div>
                  <CardTitle className="text-xl">Choose Your Support Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Whether you need behavioral support, medical coordination, or full case management—we guide you to the perfect fit.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    3
                  </div>
                  <CardTitle className="text-xl">Ongoing Monitoring & Follow-Up</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Our team ensures your care plan is executed smoothly with consistent follow-up and support.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-12">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Start Your Case Management Today
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
              Real Stories. Real Progress.
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
                    "Serenity's case management helped me stay consistent with treatment. They handled everything and made life easier."
                  </p>
                  <p className="font-semibold text-gray-900">— Jonathan M., Pontiac, MI</p>
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
                    "The behavioral case management support was incredible. They coordinated with my therapist and psychiatrist perfectly."
                  </p>
                  <p className="font-semibold text-gray-900">— Lisa G., Auburn Hills, MI</p>
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
                    "The medical case management team made my recovery smooth. I finally feel stable and supported."
                  </p>
                  <p className="font-semibold text-gray-900">— Raymond S., Troy, MI</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-b from-cyan-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Your support system begins here. Let our dedicated team coordinate every step of your recovery.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
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
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>What does case management include?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Behavioral support, medical coordination, resource guidance, and personalized monitoring.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you offer both mental and medical case management?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes—behavioral and medical case management are both included.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Can I get case management outside Pontiac?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes, we serve Auburn Hills, Troy, Waterford, Bloomfield Hills, and Rochester Hills.
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

