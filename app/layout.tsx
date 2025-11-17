// app/layout.tsx
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import Script from "next/script"
import { Playfair_Display, Source_Sans_3 as Source_Sans_Pro } from "next/font/google"
import "./globals.css"
import Analytics from "./analytics"
import { OrganizationStructuredData } from "@/components/seo/StructuredData"
import GoogleAnalytics from "@/components/seo/GoogleAnalytics"

const SITE_URL = "https://src.health"
const ORG_NAME = "Serenity Rehabilitation Center"
const OG_IMAGE = "/og-image.jpg"

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", variable: "--font-playfair" })
const sourceSans = Source_Sans_Pro({ subsets: ["latin"], weight: ["400", "600"], display: "swap", variable: "--font-source-sans" })

export const viewport: Viewport = { themeColor: "#0ea5e9", width: "device-width", initialScale: 1 }

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${ORG_NAME} - Lead Recovery Treatment`, template: `%s | ${ORG_NAME}` },
  description: "Professional lead poisoning treatment and recovery services. Restoring lives, one recovery at a time.",
  applicationName: ORG_NAME,
  generator: "Next.js",
  keywords: [
    "rehabilitation center","lead recovery","recovery treatment","patient care","rehab clinic","Serenity Rehabilitation Center",
  ],
  authors: [{ name: ORG_NAME }],
  alternates: { canonical: SITE_URL },
  verification: { google: "VrzkpR-U5IhfEdHyVKq7C0uqSyX3_Hp46XGQMOQYVjQ" },
  openGraph: {
    type: "website", url: SITE_URL, siteName: ORG_NAME,
    title: `${ORG_NAME} - Lead Recovery Treatment`,
    description: "Compassionate, evidence-based rehabilitation and recovery services with licensed clinicians.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${ORG_NAME} cover` }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${ORG_NAME} - Lead Recovery Treatment`,
    description: "Confidential assessments, licensed clinicians, and patient-centered rehab care.",
    images: [OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/2023-08-15 - Copy.png", sizes: "any", type: "image/png" },
      { url: "/2023-08-15 - Copy.png", sizes: "32x32", type: "image/png" },
      { url: "/2023-08-15 - Copy.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/2023-08-15 - Copy.png" }],
    shortcut: [{ url: "/2023-08-15 - Copy.png" }],
  },
  category: "healthcare",
  referrer: "strict-origin-when-cross-origin",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-MPEKC1KKWR"
  const GSC_VERIFICATION = process.env.NEXT_PUBLIC_GSC_VERIFICATION

  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable} antialiased`}>
      <head>
        {/* Logo/Favicon - Handled by metadata API above, but explicit links for Vercel compatibility */}
        <link rel="icon" type="image/png" sizes="any" href="/2023-08-15 - Copy.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/2023-08-15 - Copy.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/2023-08-15 - Copy.png" />
        <link rel="apple-touch-icon" href="/2023-08-15 - Copy.png" />
        <link rel="shortcut icon" href="/2023-08-15 - Copy.png" />
        
        {/* SweetAlert2 CSS via CDN (no npm needed) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css"
        />
        
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="3wLCsRN_MCI2FWekCWp7iLaunpjHTbLmMKwN1HQq9vM" />
        
        {/* Enhanced SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <link rel="canonical" href="https://src.health" />
      </head>
      <body>
        {/* Google Analytics (only inject if configured) */}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  anonymize_ip: true,
                  send_page_view: true,
                  page_title: document.title,
                  page_location: window.location.href
                });
              `}
            </Script>
          </>
        )}

        {/* SweetAlert2 JS via CDN (global window.Swal) */}
        <Script
          src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"
          strategy="beforeInteractive" /* why: allow early usage in client components */
        />

        <OrganizationStructuredData />

        {/* Google Analytics Page Tracking */}
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}

        {children}
      </body>
    </html>
  )
}
