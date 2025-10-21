"use client"

import Script from "next/script"

interface StructuredDataProps {
  type: "organization" | "medicalBusiness" | "service" | "breadcrumb"
  data: any
}

export default function StructuredData({ type, data }: StructuredDataProps) {
  const getStructuredData = () => {
    switch (type) {
      case "organization":
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Serenity Rehabilitation Center",
          url: "https://serenity-b9.onrender.com",
          logo: "https://serenity-b9.onrender.com/logo.png",
          description: "Evidence-based rehabilitation in Detroit. Confidential assessments, licensed clinicians, and personalized recovery plans.",
          address: {
            "@type": "PostalAddress",
            streetAddress: "123 Main Street",
            addressLocality: "Detroit",
            addressRegion: "MI",
            postalCode: "48201",
            addressCountry: "US"
          },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+1-313-555-0123",
            contactType: "customer service",
            areaServed: "US",
            availableLanguage: "English"
          },
          sameAs: [
            "https://www.facebook.com/serenityrehab",
            "https://www.linkedin.com/company/serenity-rehab"
          ]
        }

      case "medicalBusiness":
        return {
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          name: "Serenity Rehabilitation Center",
          description: "Professional rehabilitation services in Detroit, Michigan",
          url: "https://serenity-b9.onrender.com",
          address: {
            "@type": "PostalAddress",
            streetAddress: "123 Main Street",
            addressLocality: "Detroit",
            addressRegion: "MI",
            postalCode: "48201",
            addressCountry: "US"
          },
          telephone: "+1-313-555-0123",
          medicalSpecialty: "Rehabilitation Medicine",
          hasCredential: {
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "license",
            recognizedBy: {
              "@type": "Organization",
              name: "State of Michigan"
            }
          }
        }

      case "service":
        return {
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Rehabilitation Services",
          description: "Evidence-based rehabilitation and recovery services",
          provider: {
            "@type": "MedicalBusiness",
            name: "Serenity Rehabilitation Center"
          },
          areaServed: {
            "@type": "City",
            name: "Detroit, Michigan"
          },
          serviceType: "Rehabilitation Medicine",
          offers: {
            "@type": "Offer",
            price: "Contact for pricing",
            priceCurrency: "USD"
          }
        }

      case "breadcrumb":
        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: data.map((item: any, index: number) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url
          }))
        }

      default:
        return data
    }
  }

  return (
    <Script
      id={`structured-data-${type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(getStructuredData(), null, 2)
      }}
    />
  )
}

// Breadcrumb helper
export function BreadcrumbStructuredData({ items }: { items: Array<{ name: string; url: string }> }) {
  return <StructuredData type="breadcrumb" data={items} />
}

// Organization structured data
export function OrganizationStructuredData() {
  return <StructuredData type="organization" data={{}} />
}

// Medical business structured data
export function MedicalBusinessStructuredData() {
  return <StructuredData type="medicalBusiness" data={{}} />
}

// Service structured data
export function ServiceStructuredData() {
  return <StructuredData type="service" data={{}} />
}
