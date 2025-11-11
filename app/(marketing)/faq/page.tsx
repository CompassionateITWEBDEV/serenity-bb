// app/(marketing)/faq/page.tsx
// Enable static generation for FAQ page
export const dynamic = "error"; // Force static generation
export const revalidate = 86400; // Revalidate daily (ISR)

import type { Metadata } from "next"
import Script from "next/script"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { FAQAccordion } from "@/components/faq-accordion"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://serenity-b9.onrender.com"

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Serenity Rehabilitation Center",
  description:
    "Answers to common questions about rehabilitation, assessments, insurance, and getting started.",
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    url: `${SITE_URL}/faq`,
    title: "FAQ – Serenity Rehabilitation Center",
    description:
      "Find answers about our rehabilitation programs, insurance, confidentiality, and appointments.",
    images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ – Serenity Rehabilitation Center",
    description:
      "Answers about rehab programs, insurance, confidentiality, and how to start.",
    images: [`${SITE_URL}/og-image.jpg`],
  },
}

const faqs = [
  {
    q: "Do you accept insurance?",
    a: "Yes. We accept Medicare, BCBS, Aetna, McLaren, HAP, and Zing. Contact us to verify your benefits.",
  },
  {
    q: "How soon can I start?",
    a: "Most patients can be assessed within 24–48 hours. Same-week starts are common.",
  },
  {
    q: "Are assessments confidential?",
    a: "Yes. All assessments are private and HIPAA-compliant.",
  },
  {
    q: "Do you offer personalized care plans?",
    a: "Yes. Our licensed clinicians design individualized rehabilitation plans based on your needs.",
  },
  {
    q: "What services do you provide?",
    a: "We offer counseling services, support services, and methadone treatment programs. Visit our Services page to learn more about each program.",
  },
  {
    q: "How do I schedule an appointment?",
    a: "You can schedule an appointment by calling us at (248) 838-3686 or by filling out our contact form on the Contact page.",
  },
  {
    q: "What are your operating hours?",
    a: "We are open Monday through Friday from 6:00 AM to 5:00 PM, and Saturday from 8:00 AM to 11:00 AM. We are closed on Sundays.",
  },
  {
    q: "Is my information secure?",
    a: "Yes. We follow HIPAA regulations and use encryption and secure systems to protect your personal and health information. Please review our Privacy Policy for more details.",
  },
]

export default function FAQPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main>
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
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
                Frequently Asked Questions
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Quick answers to common questions about getting started, insurance coverage, and care.
              </p>
            </div>

            {/* FAQ Accordion */}
            <FAQAccordion faqs={faqs} />

            {/* Contact CTA */}
            <Card className="mt-8 bg-cyan-50 border-cyan-200">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Still have questions?
                </h3>
                <p className="text-gray-700 mb-4">
                  We're here to help. Contact us for more information.
                </p>
                <Link href="/contact">
                  <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-md font-medium transition-colors">
                    Contact Us
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* JSON-LD (does not affect layout) */}
      <Script
        id="faq-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  )
}
