import { Suspense } from "react";
import type { Metadata } from "next";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  CheckCircle,
  Users,
  Heart,
  Clock,
  Shield,
  Phone,
  MapPin,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Our Treatment Services | Serenity Rehabilitation Center",
  description:
    "Comprehensive, evidence-based treatment programs designed to support your recovery journey with dignity and care.",
};

/** Why: Separating into its own component keeps the page readable and easy to reorder/reuse. */
function DiscoverTreatmentOptionsSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-cyan-100 text-cyan-800 mb-4">
            Licensed Addiction Treatment Center
          </Badge>
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
            Discover Our Treatment Options
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comprehensive addiction treatment services tailored to your personal needs
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-cyan-500 rounded-full" />
              </div>
              <CardTitle className="text-lg">Counseling Services</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Group counseling</li>
                <li>• Substance abuse counseling</li>
                <li>• Individual therapy</li>
                <li>• Crisis management</li>
              </ul>
              <Button className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600">
                Learn More About Counseling
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-blue-500 rounded-full" />
              </div>
              <CardTitle className="text-lg">Methadone Treatment</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Take-home privileges</li>
                <li>• Medical monitoring</li>
                <li>• Dosage management</li>
                <li>• Safety protocols</li>
              </ul>
              <Button className="w-full mt-4 bg-blue-500 hover:bg-blue-600">
                Get Treatment Information
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-green-500 rounded-full" />
              </div>
              <CardTitle className="text-lg">Support Services</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Case management</li>
                <li>• Peer support</li>
                <li>• Family counseling</li>
                <li>• Recovery navigation</li>
              </ul>
              <Button className="w-full mt-4 bg-green-500 hover:bg-green-600">
                Access Support Services
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg p-8 mb-12">
          <h3 className="text-xl font-semibold text-center mb-8">
            Methadone Treatment Facts
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2"></div>
              <div className="text-sm text-gray-600">Years of Research</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2"></div>
              <div className="text-sm text-gray-600">Reduction in Crime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2"></div>
              <div className="text-sm text-gray-600">Reduction in HIV Risk</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">24/7</div>
              <div className="text-sm text-gray-600">Support Available</div>
            </div>
          </div>
        </div>

        {/* Contact & Eligibility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-cyan-500" />
                <div>
                  <div className="font-medium">Address</div>
                  <div className="text-sm text-gray-600">
                    673 Martin Luther King Jr Blvd N, Pontiac, MI 48342
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-cyan-500" />
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-sm text-gray-600">(248)-838-3686</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-cyan-500" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-gray-600">src.health</div>
                </div>
              </div>

              <div className="pt-4">
                <h4 className="font-medium mb-2">Operating Hours</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span>6:00 AM - 1:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>8:00 AM - 11:00 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>Closed</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <div className="text-sm font-medium text-red-800">
                    24/7 Crisis Support
                  </div>
                  <div className="text-sm text-red-600">
                    Call 248-838-3656 for emergencies
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eligibility & Cost Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Insurance Accepted</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Most major insurance plans</li>
                    <li>• Medicaid</li>
                    <li>• Medicare</li>
                    <li>• Self-pay options available</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">The First Visit</h4>
                  <p className="text-sm text-gray-600">
                    When scheduling a counseling session for the first time,
                    clients can potentially be seen the same day for an intake
                    appointment, you will be seen by a full-time social worker.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Requirements</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Complete intake assessment</li>
                    <li>• Medical evaluation required</li>
                    <li>• Insurance verification</li>
                    <li>• Photo ID and insurance card</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Need Help Now?</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Our intake coordinators are available to help you start your
                    recovery journey today.
                  </p>
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                    Call Now: (248)-838-3686
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default function CombinedServicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Our Treatment Services (FIRST) */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
              Our Treatment Services
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive, evidence-based treatment programs designed to
              support your recovery journey with dignity and care.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="border-l-4 border-l-cyan-600">
              <CardHeader>
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-cyan-600" />
                </div>
                <CardTitle>Individual Therapy</CardTitle>
                <CardDescription>
                  One-on-one counseling sessions tailored to your specific needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Cognitive Behavioral Therapy
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Trauma-Informed Care
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Motivational Interviewing
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Group Counseling</CardTitle>
                <CardDescription>
                  Peer support and shared healing experiences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Support Groups
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Family Therapy
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Educational Workshops
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>MAT Programs</CardTitle>
                <CardDescription>
                  Medication-Assisted Treatment for comprehensive care
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Methadone Treatment
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Medical Monitoring
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Dosage Management
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>24/7 Support</CardTitle>
                <CardDescription>
                  Round-the-clock crisis intervention and support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Crisis Hotline
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Emergency Support
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Peer Support Network
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Holistic Care</CardTitle>
                <CardDescription>
                  Comprehensive wellness and recovery support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Nutrition Counseling
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Mindfulness Training
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Life Skills Development
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-teal-600">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6 text-teal-600" />
                </div>
                <CardTitle>Outreach Programs</CardTitle>
                <CardDescription>
                  Community support and education initiatives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Community Education
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Prevention Programs
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Resource Coordination
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Discover Our Treatment Options (SECOND) */}
          <DiscoverTreatmentOptionsSection />

          {/* CTA Section */}
          <div className="bg-cyan-600 rounded-lg p-8 text-center text-white mt-16">
            <h2 className="text-3xl font-serif font-bold mb-4">
              Ready to Start Your Recovery Journey?
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Our compassionate team is here to support you every step of the way.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                Schedule Consultation
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-cyan-600 bg-transparent"
              >
                Call (248) 838-3650
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
