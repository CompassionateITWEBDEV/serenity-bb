export default function sitemap() {
  const base = 'https://serenity-b9.onrender.com';
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/services/rehabilitation`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/locations`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/insurance`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
