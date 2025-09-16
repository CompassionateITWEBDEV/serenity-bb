// app/layout.tsx (fixed icons block)
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import Script from "next/script"
import { Playfair_Display, Source_Sans_3 as Source_Sans_Pro } from "next/font/google"
import "./globals.css"
import Analytics from "./analytics"

const SITE_URL = "https://serenity-b9.onrender.com"
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
  keywords: ["rehabilitation center","lead recovery","recovery treatment","patient care","rehab clinic","Serenity Rehabilitation Center"],
  authors: [{ name: ORG_NAME }],
  alternates: { canonical: SITE_URL },
  verification: { google: "VrzkpR-U5IhfEdHyVKq7C0uqSyX3_Hp46XGQMOQYVjQ" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: ORG_NAME,
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
    // Put files in /public then reference them from root (no "public/" prefix)
    icon: [
      { url: "/favicon.ico" },
      { url: "/serenity.png", type: "image/png", sizes: "32x32" },   // optional custom small logo
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  category: "healthcare",
  referrer: "strict-origin-when-cross-origin",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable} antialiased`}>
      <body>
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{ anonymize_ip: true });`}
            </Script>
          </>
        )}
        <Suspense fallback={null}><Analytics /></Suspense>
        {children}
      </body>
    </html>
  )
}

/* Alternative (simplest): delete `icons` above and add one file:
   - app/icon.png (512x512 square)
   Next.js will auto-generate the favicon used at the left of the tab.
*/
