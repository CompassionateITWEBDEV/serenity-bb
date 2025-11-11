// app/robots.ts
import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { 
      userAgent: "*", 
      allow: "/",
      disallow: [
        "/dashboard/",
        "/staff/",
        "/clinician/",
        "/api/",
        "/_next/",
        "/admin/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
