import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Lock, Shield, Eye, FileText, Database, Users, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Serenity Rehabilitation Center",
  description:
    "Privacy policy explaining how Serenity Rehabilitation Center collects, uses, and protects your personal and health information.",
};

export const dynamic = "error";
export const revalidate = 604800; // 7 days

export default function PrivacyPage() {
  const sections = [
    {
      icon: Shield,
      title: "HIPAA Compliance",
      content:
        "Serenity Rehabilitation Center is committed to protecting your health information in accordance with the Health Insurance Portability and Accountability Act (HIPAA). We maintain strict physical, electronic, and administrative safeguards to protect your Protected Health Information (PHI).",
    },
    {
      icon: Database,
      title: "Information We Collect",
      content:
        "We collect information that you provide directly, including: name, contact information, medical history, insurance information, and other health-related data necessary for treatment. We also collect technical information such as IP addresses and browser types when you visit our website.",
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content:
        "We use your information to provide medical treatment, process payments, communicate with you about appointments and services, comply with legal obligations, and improve our services. We do not sell your personal information to third parties.",
    },
    {
      icon: Lock,
      title: "Information Sharing",
      content:
        "We may share your information with healthcare providers involved in your treatment, insurance companies for billing purposes, and as required by law. We only share the minimum necessary information and require all parties to maintain confidentiality. We will never share your information for marketing purposes without your explicit consent.",
    },
    {
      icon: Users,
      title: "Your Rights",
      content:
        "You have the right to access, request corrections to, and obtain copies of your health records. You may also request restrictions on how we use or disclose your information, though we may not be able to accommodate all requests. You have the right to file a complaint if you believe your privacy rights have been violated.",
    },
    {
      icon: Mail,
      title: "Communication Preferences",
      content:
        "You can choose how we communicate with you, including opting out of non-essential communications. However, we may still send you important information related to your treatment, appointments, or account security.",
    },
    {
      icon: FileText,
      title: "Data Security",
      content:
        "We implement industry-standard security measures including encryption, secure servers, access controls, and regular security audits. All staff members are trained on HIPAA compliance and data protection protocols.",
    },
    {
      icon: Shield,
      title: "Cookies and Tracking",
      content:
        "Our website may use cookies and similar technologies to improve your experience, analyze site usage, and personalize content. You can control cookie preferences through your browser settings.",
    },
    {
      icon: Database,
      title: "Data Retention",
      content:
        "We retain your health records as required by law, typically for a minimum of 6 years after your last visit or as required by state regulations. After the retention period, records are securely destroyed.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main>
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            {/* Back Button */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-teal-800 hover:text-teal-900 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4">
                Privacy Policy
              </h1>
              <p className="text-gray-600 max-w-3xl mx-auto text-lg">
                Your privacy is important to us. This policy explains how we protect and use your information.
              </p>
            </div>

            {/* Introduction */}
            <Card className="mb-8 border-cyan-600 border-t-4">
              <CardContent className="p-6">
                <p className="text-gray-700 leading-relaxed">
                  At Serenity Rehabilitation Center, we are committed to protecting your privacy and the confidentiality of your health information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services or visit our website.
                </p>
              </CardContent>
            </Card>

            {/* Privacy Sections */}
            <div className="space-y-6">
              {sections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                            <Icon className="w-6 h-6 text-cyan-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            {index + 1}. {section.title}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            {section.content}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Contact Information */}
            <Card className="mt-8 bg-cyan-50 border-cyan-200">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Privacy Concerns or Questions?
                </h3>
                <p className="text-gray-700 mb-4">
                  If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact our Privacy Officer:
                </p>
                <div className="space-y-2 text-gray-700">
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href="mailto:info@src.health" className="text-cyan-600 hover:underline">
                      info@src.health
                    </a>
                  </p>
                  <p>
                    <strong>Phone:</strong>{" "}
                    <a href="tel:+12488383686" className="text-cyan-600 hover:underline">
                      (248) 838-3686
                    </a>
                  </p>
                  <p>
                    <strong>Address:</strong> 35 S Johnson Ave, Pontiac, MI 48341
                  </p>
                  <p className="mt-4 text-sm">
                    You also have the right to file a complaint with the U.S. Department of Health and Human Services if you believe your privacy rights have been violated.
                  </p>
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

