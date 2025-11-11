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
import { Shield, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Methadone Treatment Program | Serenity Rehabilitation Center",
  description:
    "Evidence-based methadone treatment program combined with counseling and psychosocial services for opioid addiction recovery.",
};

const METHADONE_PDF_ROUTE = "/Methadone-Flyer_compressed.pdf";

export default function MethadoneTreatmentPage() {
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
              <Badge className="bg-cyan-600 text-white mb-4">Evidence-Based Care</Badge>
              <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4">
                Methadone Treatment Program
              </h1>
              <p className="text-gray-600 max-w-3xl mx-auto text-lg">
                A comprehensive, evidence-based approach to opioid addiction treatment.
              </p>
            </div>

            {/* Main Content Card */}
            <Card className="border-t-4 border-t-cyan-600 max-w-4xl mx-auto shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-cyan-600" />
                  </div>
                  About Methadone Treatment
                </CardTitle>
                <CardDescription className="text-base">
                  Long-acting opioid medication used in combination with counseling and psychosocial services.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="prose max-w-none">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Methadone is a long-acting opioid medication that is used as a pain reliever and, together with counseling and other psychosocial services, is used to treat individuals addicted to heroin and certain prescription drugs.
                  </p>
                </div>

                <div className="rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 p-6 border-l-4 border-cyan-600">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg flex items-center gap-2">
                    <Shield className="w-6 h-6 text-cyan-600" />
                    How It Works
                  </h4>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Our Methadone Treatment Program combines medication-assisted treatment (MAT) with comprehensive counseling and support services. This integrated approach helps individuals:
                  </p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-600 mt-1">•</span>
                      <span>Reduce withdrawal symptoms and cravings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-600 mt-1">•</span>
                      <span>Stabilize their daily lives</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-600 mt-1">•</span>
                      <span>Focus on recovery and rehabilitation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-600 mt-1">•</span>
                      <span>Reduce the risk of overdose</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 border-t space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Learn More</h4>
                    <p className="text-gray-600 mb-4">
                      Download our comprehensive information packet to learn more about our Methadone Treatment Program.
                    </p>
                    <a href={METHADONE_PDF_ROUTE} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white px-8 py-6 text-lg">
                        <span className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Get More Information Here
                        </span>
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Link href="/intake">
                    <Button variant="outline" className="w-full md:w-auto border-cyan-600 text-cyan-600 hover:bg-cyan-50 px-8 py-6 text-lg">
                      Start Your Treatment Journey
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

