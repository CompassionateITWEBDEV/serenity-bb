// app/services/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { CheckCircle, Users, Heart, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Counseling Services and Support Services Methadone | Serenity Rehabilitation Center",
  description:
    "Comprehensive, evidence-based treatment programs designed to support your recovery journey with dignity and care.",
};

/** Why: expose the public PDF using its root URL (files in /public are served from "/"). */
const METHADONE_PDF_ROUTE = "/Serenity-Brochure-High-Res_compressed.pdf";

/* -------- Enhanced Counseling & Methadone Dispensing Program with Animations -------- */
function LeadGenerationSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        {/* Header with staggered animation */}
        <div className="text-center mb-12 animate-[fadeInUp_0.8s_ease-out]">
          <Badge className="bg-cyan-100 text-cyan-800 mb-4 hover:bg-cyan-200 transition-colors duration-300">
            Licensed Addiction Treatment Center
          </Badge>
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
            Counseling & Methadone Dispensing Program
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comprehensive addiction treatment services tailored to your personal
            needs
          </p>
        </div>

        {/* Counseling + Support with hover animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="border-t-4 border-t-cyan-600 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-[slideInLeft_0.8s_ease-out]">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-cyan-600" />
                </div>
                Counseling Services
              </CardTitle>
              <CardDescription>
                Professional counselors are available to help patient work
                through a wide variety of issues that they might be facing
                during their life experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-cyan-600" />
                  Services Include:
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-cyan-600 mt-1">•</span>
                    <span>Individual counseling</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-cyan-600 mt-1">•</span>
                    <span>Group counseling</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-cyan-600 mt-1">•</span>
                    <span>Substance abuse counseling</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-cyan-600 mt-1">•</span>
                    <span>Family reunification</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-cyan-600 mt-1">•</span>
                    <span>Adelson Counseling</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-cyan-600 mt-1">•</span>
                    <span>Peer support</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-cyan-600 mt-1">•</span>
                    <span>After care services</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-cyan-600 mt-1">•</span>
                    <span>
                      Referral for medication evaluation and management with a
                      psychiatrist or family practice physician
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 p-4 border-l-4 border-cyan-600">
                <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-600" />
                  Confidentiality:
                </h5>
                <p className="text-sm text-gray-700 leading-relaxed">
                  All counseling records are kept strictly confidential.
                  Information is shared only with a person's written consent or
                  when it is ordered by the court.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-green-600 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-[slideInRight_0.8s_ease-out]">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                Support Services
              </CardTitle>
              <CardDescription>
                Comprehensive supports that surround counseling and treatment to
                sustain progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  What We Provide:
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Case management &amp; care coordination</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Peer support &amp; recovery coaching</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Family counseling &amp; reunification support</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Crisis management and safety planning</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Aftercare planning and relapse prevention</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Referral and linkage to community resources</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform duration-200">
                    <span className="text-green-600 mt-1">•</span>
                    <span>
                      Navigation for medical monitoring &amp; dosage management
                      (MAT)
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Methadone intro + PDF CTA with enhanced styling */}
        <div className="bg-gradient-to-br from-white to-cyan-50 rounded-2xl p-8 shadow-lg border border-cyan-100 hover:shadow-2xl transition-all duration-500 animate-[fadeInUp_0.8s_ease-out]">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                Methadone Treatment Program
              </h3>
              <Badge className="bg-cyan-600 text-white">
                Evidence-Based Care
              </Badge>
            </div>
          </div>
          <div className="text-gray-700 leading-relaxed mb-6 pl-18">
            <p className="text-lg">
              Methadone is a long-acting opioid medication that is used as a
              pain reliever and, together with counseling and other
              psychosocial services, is used to treat individuals addicted to
              heroin and certain prescription drugs.
            </p>
          </div>
          <div className="text-center pt-4">
            <a
              href={METHADONE_PDF_ROUTE}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <span className="flex items-center gap-2">
                  Get More Information Here
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- PAGE (Counseling & Methadone Program only) -------------------- */
export default function CombinedServicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section with Animation */}
          <div className="text-center mb-16 animate-[fadeIn_0.8s_ease-out]">
            <div className="inline-block mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <Heart className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-serif font-bold text-gray-900 mb-6 tracking-tight">
              Serenity Rehabilitation Center
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Your journey to recovery starts here. Comprehensive, compassionate care
              tailored to your unique needs.
            </p>
          </div>

          {/* Counseling & Methadone Dispensing Program */}
          <LeadGenerationSection />
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
