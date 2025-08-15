"use client";

import { Suspense } from "react";
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
import { CheckCircle, Users, Heart, Clock, Shield, Phone } from "lucide-react";

export const metadata = {
  title: "Our Treatment Services | Serenity Rehabilitation Center",
  description:
    "Comprehensive, evidence-based treatment programs designed to support your recovery journey with dignity and care.",
};

function ServicesContent() {
  return (
    <main className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Our Treatment Services
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive, evidence-based treatment programs designed to support
            your recovery journey with dignity and care.
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

        {/* CTA Section */}
        <div className="bg-cyan-600 rounded-lg p-8 text-center text-white">
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
  );
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <Suspense fallback={null}>
        <ServicesContent />
      </Suspense>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
