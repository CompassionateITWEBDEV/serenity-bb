import type { MetadataRoute } from "next"

const SITE_URL = "https://serenity-b9.onrender.com" // ← change me

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
