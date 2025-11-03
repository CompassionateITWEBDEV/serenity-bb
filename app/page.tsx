import Script from "next/script";
import Link from "next/link";
import type { Metadata } from "next";

import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Enable static generation for homepage
export const dynamic = "error"; // Force static generation
export const revalidate = 3600; // Revalidate every hour (ISR)

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
      <Script id="org-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
        __html: JSON.stringify(orgLd) }} />
      
      <Header />
      <HeroSection />
      
      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive rehabilitation services designed to support your recovery journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Individual Counseling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  One-on-one sessions with licensed clinicians to address personal challenges and develop coping strategies.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Group Therapy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Supportive group sessions that foster connection and shared learning experiences.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Family Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Comprehensive family counseling to strengthen relationships and support systems.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  );
}