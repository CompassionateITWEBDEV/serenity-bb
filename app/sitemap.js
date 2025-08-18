const SITE_URL = "https://serenity-b9.onrender.com"

export default function sitemap() {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/services/rehabilitation`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/appointments`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/insurance`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.7 },
  ]
}
