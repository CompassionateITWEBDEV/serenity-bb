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

import { CheckCircle, Users, Heart, Clock, Shield, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Treatment Services | Serenity Rehabilitation Center",
  description:
    "Comprehensive, evidence-based treatment programs designed to support your recovery journey with dignity and care.",
};

/** Why: expose the public PDF using its root URL (files in /public are served from "/"). */
const METHADONE_PDF_ROUTE = "/Serenity-Brochure-High-Res_compressed.pdf";

/* -------------------- SECTION 2: Discover Our Treatment Options -------------------- */
function ServicesSection() {
  const services = [
    {
      title: "Lead Detoxification",
      description:
        "Safe and effective removal of lead from your system using proven medical protocols.",
      icon: "🔬",
    },
    {
      title: "Nutritional Therapy",
      description:
        "Specialized nutrition plans to support your body's natural healing processes.",
      icon: "🥗",
    },
    {
      title: "Cognitive Rehabilitation",
      description:
        "Targeted therapies to address cognitive effects of lead exposure.",
      icon: "🧠",
    },
    {
      title: "Family Support",
      description:
        "Comprehensive support services for families affected by lead poisoning.",
      icon: "👨‍👩‍👧‍👦",
    },
    {
      title: "Environmental Assessment",
      description:
        "Professional evaluation of your living and working environments.",
      icon: "🏠",
    },
    {
      title: "Long-term Monitoring",
      description:
        "Ongoing health monitoring to ensure sustained recovery and wellness.",
      icon: "📊",
    },
  ];

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Discover Our Treatment Options
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive approach to lead poisoning recovery combines
            medical expertise with compassionate care to address every aspect of
            your healing journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-gray-200"
            >
              <CardHeader className="text-center">
                <div className="text-4xl mb-4">{service.icon}</div>
                <CardTitle className="text-xl font-serif text-gray-900">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-center leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------- SECTION 3 (LAST): Counseling & Methadone Dispensing Program -------- */
function LeadGenerationSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-cyan-100 text-cyan-800 mb-4">
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

        {/* Counseling + Support (no buttons inside) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="border-t-4 border-t-cyan-600">
            <CardHeader>
              <CardTitle className="text-xl">Counseling Services</CardTitle>
              <CardDescription>
                Professional counselors are available to help patient work
                through a wide variety of issues that they might be facing
                during their life experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Services Include:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Individual counseling.</li>
                  <li>Group counseling.</li>
                  <li>Substance abuse counseling.</li>
                  <li>Family reunification.</li>
                  <li>Adelson Counseling.</li>
                  <li>Peer support.</li>
                  <li>After care services.</li>
                  <li>
                    Referral for medication evaluation and management with a
                    psychiatrist or family practice physician.
                  </li>
                </ul>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h5 className="font-semibold text-gray-900 mb-2">
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

          <Card className="border-t-4 border-t-green-600">
            <CardHeader>
              <CardTitle className="text-xl">Support Services</CardTitle>
              <CardDescription>
                Comprehensive supports that surround counseling and treatment to
                sustain progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  What We Provide:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Case management &amp; care coordination.</li>
                  <li>Peer support &amp; recovery coaching.</li>
                  <li>Family counseling &amp; reunification support.</li>
                  <li>Crisis management and safety planning.</li>
                  <li>Aftercare planning and relapse prevention.</li>
                  <li>Referral and linkage to community resources.</li>
                  <li>
                    Navigation for medical monitoring &amp; dosage management
                    (MAT).
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Methadone intro + PDF CTA */}
        <div className="bg-white rounded-lg p-8">
          <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">
            Methadone
          </h3>
          <div className="text-gray-700 leading-relaxed mb-6">
            <p>
              Methadone is a long-acting opioid medication that is used as a
              pain reliever and, together with counseling and other
              psychosocial services, is used to treat individuals addicted to
              heroin and certain prescription drugs.
            </p>
          </div>
          <div className="text-center">
            <a
              href={METHADONE_PDF_ROUTE}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-cyan-600 hover:bg-cyan-700">
                GET more information here
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- PAGE (order: Services → Options → Program) -------------------- */
export default function CombinedServicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 1) Our Treatment Services */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
              Our Treatment Services
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive, evidence-based treatment programs designed to
              support your recovery journey with dignity and care.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="border-l-4 border-l-cyan-600">
              <CardHeader>
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-cyan-600" />
                </div>
                <CardTitle>Individual Therapy</CardTitle>
                <CardDescription>
                  One-on-one counseling sessions tailored to your specific needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Cognitive Behavioral Therapy
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Trauma-Informed Care
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Motivational Interviewing
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Group Counseling</CardTitle>
                <CardDescription>
                  Peer support and shared healing experiences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Support Groups
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Family Therapy
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Educational Workshops
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>MAT Programs</CardTitle>
                <CardDescription>
                  Medication-Assisted Treatment for comprehensive care
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Methadone Treatment
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Medical Monitoring
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Dosage Management
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>24/7 Support</CardTitle>
                <CardDescription>
                  Round-the-clock crisis intervention and support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Crisis Hotline
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Emergency Support
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Peer Support Network
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Holistic Care</CardTitle>
                <CardDescription>
                  Comprehensive wellness and recovery support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Nutrition Counseling
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Mindfulness Training
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Life Skills Development
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-teal-600">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6 text-teal-600" />
                </div>
                <CardTitle>Outreach Programs</CardTitle>
                <CardDescription>
                  Community support and education initiatives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Community Education
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Prevention Programs
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Resource Coordination
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* 2) Discover Our Treatment Options */}
          <ServicesSection />

          {/* 3) Counseling & Methadone Dispensing Program (last) */}
          <div className="mt-16">
            <LeadGenerationSection />
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
