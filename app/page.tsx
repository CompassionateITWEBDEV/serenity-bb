import Script from "next/script";
import Link from "next/link";
import type { Metadata } from "next";

import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";
import { ServicesSection } from "@/components/services-section";
import { WhoWeAreSection } from "@/components/who-we-are-section";
import { ContactCTASection } from "@/components/contact-cta-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { RecoveryCTASection } from "@/components/recovery-cta-section";
import { Footer } from "@/components/footer";

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
      streetAddress: "35 S Johnson Ave",
      addressLocality: "Pontiac",
      addressRegion: "MI",
      postalCode: "48341",
      addressCountry: "US",
    },
  };

  return (
    <main className="min-h-screen">
      <Script id="org-ld" type="application/ld+json" dangerouslySetInnerHTML={{ 
        __html: JSON.stringify(orgLd) }} />
      
      <Header />
      <HeroSection />
      <FeaturesSection />
      <WhyChooseUsSection />
      <WhoWeAreSection />
      <ServicesSection />
      <ContactCTASection />
      <TestimonialsSection />
      <RecoveryCTASection />
      <Footer />
    </main>
  );
}