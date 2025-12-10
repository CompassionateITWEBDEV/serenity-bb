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
import { FAQSection } from "@/components/faq-section";
import { RecoveryCTASection } from "@/components/recovery-cta-section";
import { Footer } from "@/components/footer";

// Enable static generation for homepage
export const dynamic = "error"; // Force static generation
export const revalidate = 3600; // Revalidate every hour (ISR)

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://serenity-b9.onrender.com";

export const metadata: Metadata = {
  title: "Rehabilitation Center in Pontiac Michigan | Serenity Recovery",    
  description:
    "Serenity Rehabilitation Center in Pontiac Michigan offers mental health services, addiction recovery programs, and compassionate treatment for long-term healing.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    url: SITE_URL,
    title: "Rehabilitation Center in Pontiac Michigan | Serenity Recovery",  
    description: "Serenity Rehabilitation Center in Pontiac Michigan offers mental health services, addiction recovery programs, and compassionate treatment for long-term healing.",
    images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],    
  },
  twitter: {
    card: "summary_large_image",
    title: "Rehabilitation Center in Pontiac Michigan | Serenity Recovery",
    description: "Serenity Rehabilitation Center in Pontiac Michigan offers mental health services, addiction recovery programs, and compassionate treatment for long-term healing.",
    images: [`${SITE_URL}/og-image.jpg`],
  },
};

export default function HomePage() {
  // Why: JSON-LD for SEO only; safe and invisible.
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "Serenity Rehabilitation Center",
    description: "Serenity Rehabilitation Center in Pontiac Michigan provides mental health services, addiction recovery programs, psychiatric evaluations, case management, peer recovery, and methadone treatment.",
    url: SITE_URL,
    telephone: "+1-248-838-3686",
    address: {
      "@type": "PostalAddress",
      streetAddress: "35 S Johnson Ave",
      addressLocality: "Pontiac",
      addressRegion: "MI",
      postalCode: "48341",
      addressCountry: "US",
    },
    openingHours: "Mo-Fr 09:00-17:00",
    image: `${SITE_URL}/og-image.jpg`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: "42.6389",
      longitude: "-83.2910",
    },
    sameAs: [
      "https://www.facebook.com/profile.php?id=100066899671960",
      "https://www.instagram.com/serenityrehabilitation/",
    ],
    medicalSpecialty: [
      "Psychiatry",
      "AddictionTreatment",
      "BehavioralHealth",
    ],
    areaServed: [
      "Pontiac MI",
      "Auburn Hills MI",
      "Waterford Township MI",
      "Bloomfield Hills MI",
      "Rochester Hills MI",
      "Sylvan Lake MI",
      "Lake Angelus MI",
      "Orion Township MI",
      "West Bloomfield MI",
      "Clarkston MI",
      "Madison Heights MI",
      "Troy MI",
    ],
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
      <FAQSection />
      <RecoveryCTASection />
      <Footer />
    </main>
  );
}