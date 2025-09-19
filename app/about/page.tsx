import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Award, Users, Heart, Shield } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">About Serenity Rehabilitation Center</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              For over 40 years, we've been dedicated to providing compassionate, evidence-based treatment for
              individuals affected by lead poisoning and addiction.
            </p>
          </div>

          {/* Mission Section */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-gray-600 mb-4">
                At Serenity Rehabilitation Center, we believe that every individual deserves the opportunity to heal and
                rebuild their life. Our mission is to provide comprehensive, compassionate care that addresses not just
                the symptoms of lead poisoning and addiction, but the whole person.
              </p>
              <p className="text-gray-600 mb-6">
                We are committed to creating a safe, supportive environment where individuals can begin their journey to
                recovery with dignity and hope.
              </p>
              <Button className="bg-cyan-600 hover:bg-indigo-500">Learn About Our Programs</Button>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">Our Values</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Heart className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
                  <span className="text-gray-600">
                    <strong>Compassion:</strong> We treat every individual with empathy and understanding
                  </span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
                  <span className="text-gray-600">
                    <strong>Safety:</strong> We provide a secure environment for healing and recovery
                  </span>
                </li>
                <li className="flex items-start">
                  <Users className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
                  <span className="text-gray-600">
                    <strong>Community:</strong> We believe in the power of peer support and connection
                  </span>
                </li>
                <li className="flex items-start">
                  <Award className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
                  <span className="text-gray-600">
                    <strong>Excellence:</strong> We maintain the highest standards of care and treatment
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-cyan-600 mb-2">40+</div>
                <div className="text-gray-600">Years of Experience</div>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-cyan-600 mb-2">5,000+</div>
                <div className="text-gray-600">Lives Transformed</div>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-cyan-600 mb-2">75%</div>
                <div className="text-gray-600">Success Rate</div>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-cyan-600 mb-2">24/7</div>
                <div className="text-gray-600">Support Available</div>
              </CardContent>
            </Card>
          </div>

          {/* Team Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-serif font-bold text-gray-900 text-center mb-12">Our Expert Team</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Dr. Sarah Johnson</h3>
                  <p className="text-cyan-600 mb-2">Medical Director</p>
                  <p className="text-sm text-gray-600">
                    Board-certified addiction medicine specialist with 20+ years of experience in lead poisoning
                    treatment.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Michael Chen, LCSW</h3>
                  <p className="text-cyan-600 mb-2">Clinical Director</p>
                  <p className="text-sm text-gray-600">
                    Licensed clinical social worker specializing in trauma-informed care and group therapy.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Lisa Rodriguez, RN</h3>
                  <p className="text-cyan-600 mb-2">Nursing Supervisor</p>
                  <p className="text-sm text-gray-600">
                    Registered nurse with expertise in medication-assisted treatment and patient care coordination.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-indigo-600 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-serif font-bold mb-4">Join Our Community of Recovery</h2>
            <p className="text-xl mb-6 opacity-90">Take the first step towards healing and transformation today.</p>
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
              Start Your Journey
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
