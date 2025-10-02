import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, ArrowRight } from "lucide-react"

export default function BlogPage() {
  const blogPosts = [
    { id: 1, title: "Understanding Lead Poisoning: Signs, Symptoms, and Treatment Options", excerpt: "Learn about the early warning signs of lead poisoning and how comprehensive treatment can help restore your health and well-being.", author: "Dr. Sarah Johnson", date: "January 15, 2024", category: "Health Education", readTime: "5 min read" },
    { id: 2, title: "The Role of Family Support in Recovery", excerpt: "Discover how family involvement can significantly impact the recovery process and learn practical ways to support your loved one's journey.", author: ", LCSW", date: "January 10, 2024", category: "Family Support", readTime: "7 min read" },
    { id: 3, title: "Medication-Assisted Treatment: Breaking Down the Myths", excerpt: "Addressing common misconceptions about MAT and explaining how it provides a safe, effective path to recovery.", author: ", RN", date: "January 5, 2024", category: "Treatment", readTime: "6 min read" },
    { id: 4, title: "Building Healthy Coping Strategies for Long-term Recovery", excerpt: "Explore evidence-based techniques for managing stress, triggers, and challenges during your recovery journey.", author: "", date: "December 28, 2023", category: "Recovery Tips", readTime: "8 min read" },
    { id: 5, title: "The Importance of Mental Health in Addiction Recovery", excerpt: "Understanding the connection between mental health and addiction, and how integrated treatment approaches lead to better outcomes.", author: ", LCSW", date: "December 20, 2023", category: "Mental Health", readTime: "6 min read" },
    { id: 6, title: "Nutrition and Recovery: Healing Your Body from the Inside Out", excerpt: "Learn how proper nutrition supports the recovery process and discover practical tips for maintaining a healthy diet.", author: ", RN", date: "December 15, 2023", category: "Wellness", readTime: "5 min read" },
  ]

  const categories = ["All","Health Education","Treatment","Recovery Tips","Family Support","Mental Health","Wellness"]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="font-serif font-bold text-gray-900 mb-4 leading-tight text-[clamp(24px,3vw,36px)]">
              Recovery Resources & Insights
            </h1>
            <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed text-[clamp(15px,1.6vw,18px)]">
              Expert guidance, educational resources, and inspiring stories to support your recovery journey.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-12 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === "All" ? "default" : "outline"}
                size="sm"
                className={category === "All" ? "bg-cyan-600 hover:bg-indigo-500" : ""}
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
                <Button className="bg-cyan-600 hover:bg-indigo-500">
                  Read Full Article
                  <ArrowRight className="w-4 h-4 ml-2" />
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
                    <span className="text-sm text-gray-500">{post.readTime}</span>
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

          {/* Newsletter */}
          <div className="mt-16 bg-indigo-600 rounded-lg p-8 text-center text-white">
            <h2 className="font-serif font-bold mb-4 leading-tight text-[clamp(22px,2.4vw,32px)]">
              Stay Informed
            </h2>
            <p className="mb-6 opacity-90 text-[clamp(15px,1.6vw,18px)]">
              Subscribe to our newsletter for the latest recovery resources and expert insights.
            </p>
            <div className="max-w-md mx-auto flex gap-4">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg text-gray-900"
              />
              <Button className="bg-white text-indigo-600 hover:bg-gray-100">Subscribe</Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
