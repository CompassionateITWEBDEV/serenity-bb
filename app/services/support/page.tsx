import { Suspense } from "react";
import type { Metadata } from "next";
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
import { CheckCircle, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Support Services | Serenity Rehabilitation Center",
  description:
    "Comprehensive support services including case management, peer support, crisis management, and aftercare planning.",
};

export default function SupportServicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main>
        <PageFadeWrapper>
        <section className="py-16">
          <div className="container mx-auto px-4">
            {/* Back Button */}
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-teal-800 hover:text-teal-900 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Services</span>
            </Link>

            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4">
                Support Services
              </h1>
              <p className="text-gray-600 max-w-3xl mx-auto text-lg">
                Comprehensive supports that surround counseling and treatment to sustain progress.
              </p>
            </div>

            {/* Main Content Card */}
            <Card className="border-t-4 border-t-green-600 max-w-4xl mx-auto shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  Comprehensive Support Programs
                </CardTitle>
                <CardDescription className="text-base">
                  Holistic support services designed to help you maintain progress and achieve long-term recovery.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h3 className="font-semibold text-xl text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    What We Provide:
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 mt-1 font-bold">•</span>
                        <span>Behavioral Health Case Management</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 mt-1 font-bold">•</span>
                        <span>Medical Case Management</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 mt-1 font-bold">•</span>
                        <span>Peer support &amp; recovery coaching</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 mt-1 font-bold">•</span>
                        <span>Family counseling &amp; reunification support</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 mt-1 font-bold">•</span>
                        <span>Crisis management and safety planning</span>
                      </li>
                    </ul>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 mt-1 font-bold">•</span>
                        <span>Aftercare planning and relapse prevention</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 mt-1 font-bold">•</span>
                        <span>Referral and linkage to community resources</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 mt-1 font-bold">•</span>
                        <span>Navigation for medical monitoring &amp; dosage management (MAT)</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-l-4 border-green-600">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">
                    Our Commitment
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    Our support services are designed to provide you with the tools, resources, and guidance needed to maintain your recovery journey. We work closely with you to develop personalized support plans that address your unique needs and circumstances.
                  </p>
                </div>

                <div className="pt-6 border-t">
                  <Link href="/intake">
                    <Button className="w-full md:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-6 text-lg">
                      Get Started Today
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
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

