import Script from "next/script";
import Link from "next/link";
import type { Metadata } from "next";

import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // optional pretty links

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://serenity-b9.onrender.com";

export const metadata: Metadata = {
  title: "Serenity Rehabilitation Center – Rehab & Recovery in Detroit, MI",
  description:
    "Evidence-based rehabilitation in Detroit. Confidential assessments, licensed clinicians, and personalized recovery plans.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    url: SITE_URL,
    title: "Serenity Rehabilitation Center – Rehab & Recovery in Detroit, MI",
    description: "Compassionate, evidence-based rehabilitation with licensed clinicians.",
    images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Serenity Rehabilitation Center – Rehab & Recovery in Detroit, MI",
    description: "Start your confidential assessment today.",
    images: [`${SITE_URL}/og-image.jpg`],
  },
};

export default function HomePage() {
  // Why: JSON-LD for SEO only; safe and invisible.
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: "Serenity Rehabilitation Center",
    url: SITE_URL,
    image: `${SITE_URL}/og-image.jpg`,
    telephone: "+1-555-555-1212", // TODO: replace with real phone
    address: {
      "@type": "PostalAddress",
      streetAddress: "123 Serenity Way",
      addressLocality: "Detroit",
      addressRegion: "MI",
      postalCode: "48201",
      addressCountry: "US",
    },
  };

  return (
    <main className="min-h-screen">
      <Script id="org-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />

      <Header />
      <HeroSection />

      {/* Explore site sections (links to existing pages) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <Link href="/services" className="block">
              <Card className="h-full hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle>Our Treatment Services</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Evidence-based programs and 24/7 support tailored to your recovery.
                </CardContent>
              </Card>
            </Link>

            <Link href="/about" className="block">
              <Card className="h-full hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle>About Serenity</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Mission, values, and the team behind our compassionate care.
                </CardContent>
              </Card>
            </Link>

            <Link href="/contact" className="block">
              <Card className="h-full hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle>Contact & Visit</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Reach our coordinators and find directions to our clinic.
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
