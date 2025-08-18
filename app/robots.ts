// app/robots.ts
import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",    // apply to all crawlers
      allow: "/",        // allow crawling of all paths
    },
    sitemap: "https://serenity-b9.onrender.com/sitemap.xml",
  }
}
