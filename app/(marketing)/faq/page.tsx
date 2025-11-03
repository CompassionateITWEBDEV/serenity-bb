// app/(marketing)/faq/page.tsx
// Enable static generation for FAQ page
export const dynamic = "error"; // Force static generation
export const revalidate = 86400; // Revalidate daily (ISR)

import type { Metadata } from "next"
import Script from "next/script"

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
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      {/* JSON-LD (does not affect layout) */}
      <Script
        id="faq-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <h1 className="text-3xl font-semibold">Frequently Asked Questions</h1>
      <p className="mt-2 text-gray-600">
        Quick answers to common questions about getting started, insurance coverage, and care.
      </p>

      <ul className="mt-8 space-y-6">
        {faqs.map(({ q, a }) => (
          <li key={q}>
            <h2 className="text-xl font-medium">{q}</h2>
            <p className="mt-2">{a}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
