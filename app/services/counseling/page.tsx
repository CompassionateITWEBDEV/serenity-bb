import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Heart, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Counseling Services | Serenity Rehabilitation Center",
  description:
    "Professional counseling services including individual, group, and substance abuse counseling with strict confidentiality.",
};

export default function CounselingServicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main>
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
                Counseling Services
              </h1>
              <p className="text-gray-600 max-w-3xl mx-auto text-lg">
                Professional counselors are available to help patients work through a wide variety of issues that they might be facing during their life experience.
              </p>
            </div>

            {/* Main Content Card */}
            <Card className="border-t-4 border-t-cyan-600 max-w-4xl mx-auto shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-cyan-600" />
                  </div>
                  Comprehensive Counseling Programs
                </CardTitle>
                <CardDescription className="text-base">
                  Evidence-based counseling approaches tailored to your unique needs and recovery journey.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h3 className="font-semibold text-xl text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-cyan-600" />
                    Services Include:
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start gap-3">
                        <span className="text-cyan-600 mt-1 font-bold">•</span>
                        <span>Individual counseling</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-cyan-600 mt-1 font-bold">•</span>
                        <span>Group counseling</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-cyan-600 mt-1 font-bold">•</span>
                        <span>Substance abuse counseling</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-cyan-600 mt-1 font-bold">•</span>
                        <span>Family reunification</span>
                      </li>
                    </ul>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start gap-3">
                        <span className="text-cyan-600 mt-1 font-bold">•</span>
                        <span>Adelson Counseling</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-cyan-600 mt-1 font-bold">•</span>
                        <span>Peer support</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-cyan-600 mt-1 font-bold">•</span>
                        <span>After care services</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-cyan-600 mt-1 font-bold">•</span>
                        <span>Referral for medication evaluation and management with a psychiatrist or family practice physician</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 p-6 border-l-4 border-cyan-600">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                    <Shield className="w-6 h-6 text-cyan-600" />
                    Confidentiality:
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    All counseling records are kept strictly confidential. Information is shared only with a person's written consent or when it is ordered by the court.
                  </p>
                </div>

                <div className="pt-6 border-t">
                  <Link href="/intake">
                    <Button className="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white px-8 py-6 text-lg">
                      Get Started Today
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

