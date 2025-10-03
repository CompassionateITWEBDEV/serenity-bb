// app/blog/page.tsx
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

/**
 * PDFs:
 *   - public/pdf/pdf_article_1_mat.pdf            (Medication-Assisted Treatment)
 *   - public/pdf/pdf_article_2_inside_serenity.pdf (Inside Serenity: Your Journey to Lasting Recovery)
 */

export default function BlogPage() {
  const blogPosts = [
    {
      id: 1,
      title:
        "Medication-Assisted Treatment: What It Is and How It Supports Recovery",
      excerpt:
        "Explore how MAT pairs safe, FDA-approved medications with counseling to reduce cravings, stabilize withdrawal, and support long-term recovery.",
      category: "Health Education",
      pdfUrl: "/pdf/pdf_article_1_mat.pdf",
    },
    {
      id: 2,
      title: "Inside Serenity: Your Journey to Lasting Recovery",
      excerpt:
        "From structured routines to comprehensive therapy, learn how a supportive environment can transform your recovery journey.",
      category: "Family Support",
      pdfUrl: "/pdf_article_2_serenity-1-6.pdf",
    },
    {
      id: 3,
      title: "Your Recovery Roadmap: Understanding Treatment Options",
      excerpt:
        "From medication-assisted treatment to outpatient care, review evidence-based approaches that help you reclaim your life.",
      category: "Treatment",
      pdfUrl: "/pdf_article_3_roadmap-1-5.pdf",
    },
  ];

  const categories = [
    "All",
    "Health Education",
    "Treatment",
    "Recovery Tips",
    "Family Support",
    "Mental Health",
    "Wellness",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="font-serif font-bold text-gray-900 mb-4 leading-tight text-[clamp(24px,3vw,36px)]">
              Recovery Resources &amp; Insights
            </h1>
            <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed text-[clamp(15px,1.6vw,18px)]">
              Expert guidance, educational resources, and inspiring stories to
              support your recovery journey.
            </p>
          </div>

          {/* Category Filter (static UI) */}
          <div className="flex flex-wrap gap-2 mb-12 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === "All" ? "default" : "outline"}
                size="sm"
                className={
                  category === "All" ? "bg-cyan-600 hover:bg-indigo-500" : ""
                }
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Featured Post (Medication-Assisted Treatment) */}
          <Card className="mb-12 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3">
                <div className="h-64 md:h-full bg-gradient-to-br from-cyan-500 to-indigo-600" />
              </div>
              <div className="md:w-2/3 p-8">
                <Badge className="mb-4 bg-cyan-100 text-cyan-800">Featured</Badge>
                <h2 className="font-serif font-bold text-gray-900 mb-4 leading-snug text-[clamp(22px,2.4vw,32px)]">
                  {blogPosts[0].title}
                </h2>
                <p className="text-gray-700 mb-6 leading-relaxed text-[clamp(15px,1.6vw,18px)]">
                  {blogPosts[0].excerpt}
                </p>

                <Button asChild className="bg-cyan-600 hover:bg-indigo-500">
                  <a
                    href={blogPosts[0].pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open featured article PDF"
                  >
                    Read Full Article
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </Card>

          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(1).map((post) => {
              const hasPdf = Boolean(post.pdfUrl);
              return (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{post.category}</Badge>
                    </div>
                    <CardTitle className="font-serif leading-snug line-clamp-2 text-[clamp(18px,2vw,26px)]">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 text-[clamp(15px,1.6vw,18px)]">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hasPdf ? (
                      <Button asChild variant="outline" className="w-full bg-transparent">
                        <a
                          href={post.pdfUrl as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open PDF: ${post.title}`}
                        >
                          Read More
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="w-full bg-transparent">
                        <a
                          href={post.pdfUrl as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open PDF: ${post.title}`}
                        >
                          Read More
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
