// app/page.tsx
import Script from "next/script"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ServicesSection } from "@/components/services-section"
import { AboutSection } from "@/components/about-section"
import { LeadGenerationSection } from "@/components/lead-generation-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://serenity-b9.onrender.com"

// --- Add SEO metadata ---
export const metadata: Metadata = {
  title: "Serenity Rehabilitation Center - Compassionate Rehab & Recovery",
  description:
    "Professional rehabilitation and recovery services. Confidential assessments, licensed clinicians, and patient-centered care.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    url: SITE_URL,
    title: "Serenity Rehabilitation Center",
    description:
      "Evidence-based rehabilitation and recovery services with licensed clinicians.",
    images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Serenity Rehabilitation Center",
    description:
      "Compassionate rehab & recovery. Start your confidential assessment today.",
    images: [`${SITE_URL}/og-image.jpg`],
  },
}

export default function HomePage() {
  // ✅ Only inject JSON-LD (safe, invisible to UI)
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: "Serenity Rehabilitation Center",
    url: SITE_URL,
    image: `${SITE_URL}/og-image.jpg`,
    telephone: "+1-555-555-1212", // replace with real phone
    address: {
      "@type": "PostalAddress",
      streetAddress: "123 Serenity Way",
      addressLocality: "Detroit",
      addressRegion: "MI",
      postalCode: "48201",
      addressCountry: "US",
    },
  }

  return (
    <main className="min-h-screen">
      {/* 🔒 Safe: JSON-LD doesn’t affect layout */}
      <Script
        id="org-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />

      {/* Your exact sections — untouched */}
      <Header />
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <LeadGenerationSection />
      <ContactSection />
      <Footer />
    </main>
  )
}
