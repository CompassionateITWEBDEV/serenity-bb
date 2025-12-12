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
import { ArrowLeft, CheckCircle2, Clock, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health";

export const metadata: Metadata = {
  title: "Peer Recovery Support in Pontiac Michigan | Peer Mentorship & Recovery Coaching",
  description:
    "Get compassionate peer recovery support in Pontiac Michigan. We offer peer support and mentorship services plus recovery coaching. Serving Auburn Hills, Waterford, Troy & nearby areas. Start your recovery journey today.",
  alternates: { canonical: `${SITE_URL}/services/peer-recovery-support` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Serenity Rehabilitation Center",
  description: "Peer recovery support in Pontiac Michigan including peer support and mentorship services and recovery coaching. Serving Auburn Hills, Waterford, Troy, Bloomfield Hills, and Rochester Hills.",
  url: `${SITE_URL}/services/peer-recovery-support`,
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
  service: [
    {
      "@type": "MedicalProcedure",
      name: "Peer Recovery Support in Pontiac Michigan",
      description: "Support from trained peer specialists with lived recovery experience.",
    },
    {
      "@type": "MedicalProcedure",
      name: "Peer Support and Mentorship Services",
      description: "Emotional and motivational support for addiction recovery and mental wellness.",
    },
    {
      "@type": "MedicalProcedure",
      name: "Recovery Coaching in Pontiac",
      description: "Goal-based coaching for sobriety and long-term wellness.",
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
};

export default function PeerRecoverySupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Script id="peer-recovery-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
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
              <Badge className="bg-cyan-600 text-white mb-4">Peer Support</Badge>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                Peer Recovery Support in Pontiac, Michigan
              </h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
                Peer Recovery Support in Pontiac, Michigan for Real Guidance & Lasting Healing
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Recover with the help of trained peer specialists who understand your journey, your struggles, and your goals — because they've lived it.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/intake">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Start Peer Recovery Support Today
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50">
                    Call Us Now: (248) 838-3686
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
              Why Choose Peer Recovery Support in Pontiac, Michigan
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Our peer recovery support in Pontiac, Michigan bridges the gap between clinical treatment and real-life support. Our trained peer recovery coaches use lived experience, empathy, and motivational strategies to help individuals navigate addiction recovery, mental health challenges, and everyday obstacles. With peer recovery support in Pontiac, Michigan, clients feel understood, encouraged, and supported every step of the way.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <Users className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Certified Specialists</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Peer Support Specialists with real-life recovery experience</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Heart className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">One-on-One Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Emotional support & motivation</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CheckCircle2 className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Goal Guidance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">For treatment, goals, and daily routines</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Clock className="w-10 h-10 text-cyan-600 mb-2" />
                  <CardTitle className="text-lg">Relapse Prevention</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Help preventing relapse and building healthy habits</p>
                </CardContent>
              </Card>
            </div>
            
            <p className="text-gray-600 mt-6">
              Serving Pontiac, Auburn Hills, Waterford, Bloomfield Hills, Troy & Rochester Hills
            </p>
          </div>
        </section>

        {/* Peer Support and Mentorship */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Peer Support and Mentorship Services
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our peer support and mentorship services empower individuals through shared experience, emotional encouragement, and accountability. Every session helps build trust, confidence, and resilience. Through our peer support and mentorship services, clients gain someone who listens, understands their struggles, and helps them take steady steps forward.
            </p>
            <p className="text-lg text-gray-700">
              Our peer support and mentorship services also connect you with group meetings, therapy sessions, and recovery-friendly community programs.
            </p>
          </div>
        </section>

        {/* Recovery Coaching */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              Recovery Coaching in Pontiac
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our recovery coaching in Pontiac gives clients ongoing guidance for navigating sobriety and mental wellness. Whether it's setting goals, avoiding triggers, or building a positive routine, our recovery coaching in Pontiac provides practical tools for success.
            </p>
            <p className="text-lg text-gray-700">
              Every client works closely with a specialist trained in recovery coaching in Pontiac to strengthen their mindset, increase stability, and maintain progress.
            </p>
          </div>
        </section>

        {/* About Our Team */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
              About Our Peer Recovery Support Team
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Our peer specialists bring authenticity, empathy, and lived experience into every session. Serenity Rehabilitation Center proudly supports individuals throughout Pontiac, Auburn Hills, Waterford, Bloomfield Hills, Troy, and Rochester Hills on their recovery journey.
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
                  <CardTitle className="text-xl">Personalized Consultation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We understand your recovery history, challenges, and goals.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    2
                  </div>
                  <CardTitle className="text-xl">Match You With the Right Peer Specialist</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Choose a support style and recovery coach that best fits your journey.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    3
                  </div>
                  <CardTitle className="text-xl">Continuous Guidance & Follow-Up</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Your peer coach stays with you weekly or daily — depending on your needs.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-12">
              <Link href="/intake">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Start Your Recovery Journey Today
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4 text-center">
              What Clients Say About Our Peer Recovery Support
            </h2>
            <p className="text-center text-lg text-gray-600 mb-12">
              Real Voices. Real Strength.
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
                    "My peer recovery coach helped me stay strong when I felt weak. Their experience motivated me like nothing else."
                  </p>
                  <p className="font-semibold text-gray-900">— Jasmine L., Pontiac, MI</p>
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
                    "The peer support and mentorship services gave me someone who truly understood what recovery feels like."
                  </p>
                  <p className="font-semibold text-gray-900">— Anthony B., Waterford, MI</p>
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
                    "The recovery coaching in Pontiac was life-changing. I finally feel like I'm not alone."
                  </p>
                  <p className="font-semibold text-gray-900">— Claire R., Auburn Hills, MI</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-b from-cyan-600 to-cyan-700 text-white">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Healing begins with connection — and we're ready when you are.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/intake">
                <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                  Book Your Peer Support Session
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
                  <CardTitle>What is peer recovery support?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    It's emotional, motivational, and goal-based support from someone who has lived experience in recovery.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Is peer support different from therapy?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes — peer support is mentorship, not clinical treatment, but both work together.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>How often can I meet with my peer specialist?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Weekly, bi-weekly, or even daily depending on your needs.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Do you serve areas outside Pontiac?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes — Auburn Hills, Waterford, Bloomfield Hills, Troy & Rochester Hills.
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

