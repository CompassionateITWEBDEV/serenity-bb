// app/sitemap.ts
import type { MetadataRoute } from "next"

// Production domain for Serenity Rehabilitation Center
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://src.health"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  
  return [
    // ============================================
    // LANDING PAGE (Highest Priority - Homepage)
    // ============================================
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0, // Highest priority - landing page/homepage
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9, // High priority - main services page
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9, // High priority - about page
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9, // High priority - contact page
    },
    {
      url: `${SITE_URL}/intake`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9, // High priority - patient intake
    },

    // ============================================
    // SERVICE PAGES (High Priority for SEO)
    // ============================================
    {
      url: `${SITE_URL}/services/counseling`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/services/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/services/methadone`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },

    // ============================================
    // INFORMATION PAGES (Medium-High Priority)
    // ============================================
    {
      url: `${SITE_URL}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8, // FAQ is important for customer queries
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },

    // ============================================
    // LEGAL PAGES (Required but Lower Priority)
    // ============================================
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },

    // ============================================
    // AUTHENTICATION PAGES (Lower Priority)
    // ============================================
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/staff/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4, // Staff pages lower priority
    },
  ]
}
