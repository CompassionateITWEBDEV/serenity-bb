// app/about/page.tsx
export const dynamic = "error"; // make static
export const revalidate = 86400; // ISR: 24h

import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PageFadeWrapper } from "@/components/page-fade-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Users, Heart, Shield, Sparkles, Target, ArrowRight } from "lucide-react";
import { LocationMap } from "@/components/location-map";

/**
 * About & Goal summary in one paragraph with a catchy hero design.
 * Why: Improves scan-ability and aligns with request for a single concise paragraph.
 */
function AboutGoalSummary() {
  return (
    <section aria-labelledby="about-goal" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-600 via-cyan-600 to-sky-500" />
      <div className="absolute inset-0 -z-10 opacity-10 [background-image:radial-gradient(60rem_60rem_at_80%_-10%,white_10%,transparent_60%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <Card className="mx-auto max-w-3xl border-0 shadow-2xl ring-1 ring-white/20">
          <CardContent className="p-8 md:p-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              <Sparkles className="h-4 w-4" />
              Serenity Rehabilitation Center, Inc.
            </div>
            <h1
              id="about-goal"
              className="mb-4 flex items-center gap-3 text-3xl sm:text-4xl font-serif font-bold text-gray-900"
            >
              <Target className="h-7 w-7 text-cyan-600" />
              About Us & Our Goal
            </h1>
            <p className="text-[1.05rem] leading-relaxed text-gray-700 text-justify">
              Serenity Rehabilitation Center, Inc. delivers evidence-based care for substance use disorders
              and co-occurring mental health challenges, combining medication-assisted treatment, intensive
              therapy, and supportive counseling into personalized, family-involved plans. Our goal is to
              provide rapid, high-quality therapeutic interventions—up to six hours per day when needed—for
              children, adolescents, and adults, in the least restrictive setting, teaching proactive coping
              skills that build lasting wellness and independence.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
             <Button asChild variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <Link href="/contact">Talk to a Clinician</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/** Reusable section kept as-is (image + stats). */
export function AboutSection() {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <img
              src="/caring-nurse-helping-patient-in-medical-setting.jpg"
              alt="Caring nurse helping patient in medical setting"
              className="rounded-2xl shadow-xl"
            />
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-serif font-bold text-gray-900">
              Join Our Community of Hope and Recovery
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Serenity Rehabilitation Center has been a beacon of hope for individuals and families affected by
              lead poisoning. Our multidisciplinary team of medical professionals, nutritionists, and counselors
              work together to create personalized treatment plans that address your unique needs.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">10+</h3>
                <p className="text-gray-600">Successful Recoveries</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">2+</h3>
                <p className="text-gray-600">Years of Experience</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">24/7</h3>
                <p className="text-gray-600">Support Available</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">98%</h3>
                <p className="text-gray-600">Patient Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Values list */
function ValuesSection() {
  return (
    <section className="grid lg:grid-cols-2 gap-12 mb-16">
      <div className="bg-white rounded-lg p-8 shadow-sm">
        <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">Our Values</h3>
        <ul className="space-y-3">
          <li className="flex items-start">
            <Heart className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
            <span className="text-gray-700">
              <strong>Compassion:</strong> We treat every individual with empathy and understanding
            </span>
          </li>
          <li className="flex items-start">
            <Shield className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
            <span className="text-gray-700">
              <strong>Safety:</strong> We provide a secure environment for healing and recovery
            </span>
          </li>
          <li className="flex items-start">
            <Users className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
            <span className="text-gray-700">
              <strong>Community:</strong> We believe in the power of peer support and connection
            </span>
          </li>
          <li className="flex items-start">
            <Award className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
            <span className="text-gray-700">
              <strong>Excellence:</strong> We maintain the highest standards of care and treatment
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** CTA */
function CTASection() {
  return (
    <div className="bg-indigo-600 rounded-lg p-8 text-center text-white">
      <h2 className="text-3xl font-serif font-bold mb-4">Join Our Community of Recovery</h2>
      <p className="text-xl mb-6 opacity-90">Take the first step towards healing and transformation today.</p>
      <Button size="lg" asChild className="bg-white text-indigo-600 hover:bg-gray-100">
        <Link href="/intake">Start Your Journey</Link>
      </Button>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <PageFadeWrapper>
        <AboutGoalSummary />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <AboutSection />
          <ValuesSection />
          <CTASection />
          
          {/* Map Section */}
          <section className="mt-16">
            <Card>
              <CardContent className="p-0">
                <div className="p-6 pb-4">
                  <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Find Us</h2>
                  <p className="text-gray-600">Visit us at our location in Pontiac, Michigan</p>
                </div>
                <div className="h-96 w-full">
                  <LocationMap
                    address="673 Martin Luther King Jr Blvd N, Pontiac, MI 48342"
                    latitude={42.6420}
                    longitude={-83.2920}
                    height="100%"
                  />
                </div>
                <div className="p-6 pt-4">
                  <p className="text-sm text-gray-600">
                    <strong>Address:</strong> 673 Martin Luther King Jr Blvd N, Pontiac, MI 48342
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
        </PageFadeWrapper>
      </main>
      <Footer />
    </div>
  );
}
