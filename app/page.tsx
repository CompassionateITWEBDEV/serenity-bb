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
    description: "Serenity Rehabilitation Center in Pontiac Michigan provides mental health services, addiction recovery programs, psychiatric evaluations, case management, peer recovery, methadone treatment, suboxone treatment, naltrexone, antabuse, medication management, primary care, counseling services, emergency dosing, directly observed therapy, and DOT physicals.",
    url: SITE_URL,
    telephone: "+1-248-838-3686",
    address: {
      "@type": "PostalAddress",
      streetAddress: "673 Martin Luther King Jr Blvd N",
      addressLocality: "Pontiac",
      addressRegion: "MI",
      postalCode: "48342",
      addressCountry: "US",
    },
    openingHours: "Mo-Fr 09:00-17:00",
    image: `${SITE_URL}/og-image.jpg`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: "42.6420",
      longitude: "-83.2920",
    },
    sameAs: [
      "https://www.facebook.com/profile.php?id=100066899671960",
      "https://www.instagram.com/serenityrehabilitation/",
    ],
    medicalSpecialty: [
      "Psychiatry",
      "AddictionTreatment",
      "BehavioralHealth",
      "PrimaryCare",
      "RehabilitationMedicine",
    ],
    award: "Joint Commission Accredited",
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "accreditation",
        recognizedBy: {
          "@type": "Organization",
          name: "The Joint Commission",
          url: "https://www.jointcommission.org"
        }
      }
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
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Serenity Rehabilitation Center Services",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Mental Health Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Psychiatric Evaluation",
                description: "Comprehensive mental health assessments and psychiatric diagnosis",
                url: `${SITE_URL}/services/psychiatric-evaluation`
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Counseling Services",
                description: "Professional mental health counseling, behavioral health therapy, and trauma support",
                url: `${SITE_URL}/services/counseling`
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Medication Management",
                description: "Psychiatric and primary care medication management services",
                url: `${SITE_URL}/services/medication-management`
              }
            }
          ]
        },
        {
          "@type": "OfferCatalog",
          name: "Addiction Treatment Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Methadone Treatment",
                description: "Medically supervised methadone treatment program for opioid addiction recovery",
                url: `${SITE_URL}/services/methadone`
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Suboxone Treatment",
                description: "Safe, effective Suboxone treatment for opioid addiction recovery",
                url: `${SITE_URL}/services/suboxone`
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Naltrexone & Antabuse",
                description: "Naltrexone and Antabuse treatment for alcohol and opioid addiction recovery",
                url: `${SITE_URL}/services/naltrexone-antabuse`
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Emergency Dosing",
                description: "Urgent medication dosing services for emergency medication access",
                url: `${SITE_URL}/services/emergency-dosing`
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Directly Observed Therapy (DOT)",
                description: "Supervised medication administration to ensure treatment compliance",
                url: `${SITE_URL}/services/directly-observed-therapy`
              }
            }
          ]
        },
        {
          "@type": "OfferCatalog",
          name: "Support & Care Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Case Management",
                description: "Behavioral health and medical case management services",
                url: `${SITE_URL}/services/case-management`
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Peer Recovery Support",
                description: "Peer support and mentorship services from trained specialists",
                url: `${SITE_URL}/services/peer-recovery-support`
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Primary Care Services",
                description: "Comprehensive primary care including general health and preventive care",
                url: `${SITE_URL}/services/primary-care`
              }
            }
          ]
        },
        {
          "@type": "OfferCatalog",
          name: "Certification & Compliance Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "DOT Physicals",
                description: "Department of Transportation physical examinations for commercial drivers",
                url: `${SITE_URL}/services/dot-physicals`
              }
            }
          ]
        }
      ]
    }
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
      <FAQSection />
      <Footer />
    </main>
  );
}