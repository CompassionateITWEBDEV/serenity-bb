"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"

interface GoogleAnalyticsProps {
  gaId: string
}

function GoogleAnalyticsInner({ gaId }: GoogleAnalyticsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      const query = searchParams?.toString()
      const page_path = query ? `${pathname}?${query}` : pathname
      
      // Track page view
      window.gtag("config", gaId, {
        page_path,
        page_title: document.title,
        page_location: window.location.href,
      })
      
      // Send page view event
      window.gtag("event", "page_view", {
        page_path,
        page_title: document.title,
        page_location: window.location.href,
      })
    }
  }, [pathname, searchParams, gaId])

  return null
}

export default function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner gaId={gaId} />
    </Suspense>
  )
}

// Declare gtag function for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}
