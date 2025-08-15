import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import Script from "next/script"
import { Playfair_Display, Source_Sans_3 as Source_Sans_Pro } from "next/font/google"
import "./globals.css"
import Analytics from "./analytics"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
})

const sourceSans = Source_Sans_Pro({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-source-sans",
})

export const metadata: Metadata = {
  title: "Serenity Rehabilitation Center - Lead Recovery Treatment",
  description:
    "Professional lead poisoning treatment and recovery services. Restoring lives, one recovery at a time.",
  generator: "v0.app",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable} antialiased`}>
      <body>
        {/* Google Analytics (only inject if configured) */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}

        {/* Wrap any client component that may use useSearchParams/usePathname in Suspense */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>

        {children}
      </body>
    </html>
  )
}
