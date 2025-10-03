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
import { Calendar, User, ArrowRight } from "lucide-react";

export default function BlogPage() {
  // Place the PDF at: public/pdf/pdf_article_1_mat.pdf
  const FEATURED_PDF_URL = "/pdf_article_1_mat.pdf";

  const blogPosts = [
    {
      id: 1,
      title:
        "Medication-Assisted Treatment: What It Is and How It Supports Recovery",
      excerpt:
        "Explore how MAT pairs safe, FDA-approved medications with counseling to reduce cravings, stabilize withdrawal, and support long-term recovery.",
         category: "Health Education",
      
    },
    {
      id: 2,
      title: "Inside Serenity: Your Journey to Lasting Recovery",
      excerpt:
        "From structured routines to comprehensive therapy, learn how a supportive environment can transform your recovery journey.",
         category: "Family Support",
      
    },
    {
      id: 3,
      title: "Your Recovery Roadmap: Understanding Treatment Options",
      excerpt:
        "From medication-assisted treatment to outpatient care, review evidence-based approaches that help you reclaim your life.",
        category: "Treatment",
      
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

          {/* Featured Post */}
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
                <div className="flex items-center text-sm text-gray-500 mb-6">
                  <User className="w-4 h-4 mr-2" />
                  <span className="mr-4">{blogPosts[0].author}</span>
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="mr-4">{blogPosts[0].date}</span>
                  <span>{blogPosts[0].readTime}</span>
                </div>
                <Button asChild className="bg-cyan-600 hover:bg-indigo-500">
                  <a href={FEATURED_PDF_URL} target="_blank" rel="noopener noreferrer">
                    Read Full Article
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </Card>

          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(1).map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{post.category}</Badge>
                    <span className="text-sm text-gray-500">
                      {post.readTime}
                    </span>
                  </div>
                  <CardTitle className="font-serif leading-snug line-clamp-2 text-[clamp(18px,2vw,26px)]">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-[clamp(15px,1.6vw,18px)]">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <User className="w-4 h-4 mr-2" />
                    <span className="mr-4">{post.author}</span>
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{post.date}</span>
                  </div>
                  <Button variant="outline" className="w-full bg-transparent">
                    Read More
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
