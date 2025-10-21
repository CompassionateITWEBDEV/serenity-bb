"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"

function AnalyticsInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID
    if (!GA_ID || typeof window === "undefined") return

    const query = searchParams?.toString()
    const page_path = query ? `${pathname}?${query}` : pathname

    // @ts-ignore - gtag injected by layout
    window.gtag?.("config", GA_ID, { page_path })
  }, [pathname, searchParams])

  return null
}

export default function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  )
}
