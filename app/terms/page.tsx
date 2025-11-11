import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, Shield, AlertCircle, Lock, Users, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Serenity Rehabilitation Center",
  description:
    "Terms and conditions for using Serenity Rehabilitation Center's services and website.",
};

export const dynamic = "error";
export const revalidate = 604800; // 7 days

export default function TermsPage() {
  const sections = [
    {
      icon: Shield,
      title: "Medical Disclaimer",
      content:
        "This website and our services do not replace professional medical advice, diagnosis, or treatment. Always consult your healthcare provider for medical decisions. In case of a medical emergency, call 911 immediately.",
    },
    {
      icon: Users,
      title: "User Responsibilities",
      content:
        "You agree to provide accurate, current, and complete information when using our services. You must use our services for lawful purposes only and in accordance with these Terms of Service. You are responsible for maintaining the confidentiality of your account credentials.",
    },
    {
      icon: Lock,
      title: "Confidentiality and Privacy",
      content:
        "Your medical and personal data is confidential and protected in accordance with HIPAA regulations. We use encryption and secure systems to protect your privacy. Please review our Privacy Policy for detailed information about how we collect, use, and protect your information.",
    },
    {
      icon: FileText,
      title: "Communication",
      content:
        "By using our services, you agree to receive notifications, messages, appointment reminders, and other communications related to your healthcare. You may opt out of non-essential communications at any time through your account settings.",
    },
    {
      icon: AlertCircle,
      title: "Limitation of Liability",
      content:
        "Serenity Rehabilitation Center is not liable for damages resulting from misuse of our services, incorrect information submitted by users, or circumstances beyond our reasonable control. We do not guarantee uninterrupted or error-free service.",
    },
    {
      icon: Scale,
      title: "Modifications to Terms",
      content:
        "We reserve the right to update these Terms of Service at any time. Significant changes will be communicated to users. Continued use of our services after changes constitutes acceptance of the updated terms. The 'Last Updated' date at the top of this page indicates when these terms were last revised.",
    },
    {
      icon: Shield,
      title: "Termination",
      content:
        "We reserve the right to suspend or terminate access to our services for violations of these terms, fraudulent activity, or any other reason we deem necessary to protect our patients, staff, or services.",
    },
    {
      icon: FileText,
      title: "Intellectual Property",
      content:
        "All content on this website, including text, graphics, logos, and software, is the property of Serenity Rehabilitation Center and is protected by copyright and trademark laws. You may not reproduce, distribute, or create derivative works without our written permission.",
    },
    {
      icon: Users,
      title: "Third-Party Services",
      content:
        "Our services may include links to third-party websites or services. We are not responsible for the content, privacy policies, or practices of third-party sites. Your interactions with third-party services are at your own risk.",
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
                Terms of Service
              </h1>
              <p className="text-gray-600 max-w-3xl mx-auto text-lg">
                Please read these terms carefully before using our services.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Last Updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            {/* Introduction */}
            <Card className="mb-8 border-cyan-600 border-t-4">
              <CardContent className="p-6">
                <p className="text-gray-700 leading-relaxed">
                  Welcome to Serenity Rehabilitation Center. By accessing or using our website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
              </CardContent>
            </Card>

            {/* Terms Sections */}
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
                  Questions About These Terms?
                </h3>
                <p className="text-gray-700 mb-4">
                  If you have any questions about these Terms of Service, please contact us:
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
                    <strong>Address:</strong> 673 Martin Luther King Jr Blvd N, Pontiac, MI 48342
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
