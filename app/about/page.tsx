import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Users, Heart, Shield } from "lucide-react";

/** Reusable section kept as-is */
export function AboutSection() {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <img
              src="/caring-nurse-helping-patient-in-medical-setting.jpg"
              alt="Caring nurse helping patient in medical setting"
              className="rounded-2xl shadow-xl"
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-serif font-bold text-gray-900">
              Join Our Community of Hope and Recovery
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Serenity Rehabilitation Center has been a beacon of hope for
              individuals and families affected by lead poisoning. Our
              multidisciplinary team of medical professionals, nutritionists,
              and counselors work together to create personalized treatment
              plans that address your unique needs.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">10+</h3>
                <p className="text-gray-600">Successful Recoveries</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">2+</h3>
                <p className="text-gray-600">Years of Experience</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">24/7</h3>
                <p className="text-gray-600">Support Available</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">98%</h3>
                <p className="text-gray-600">Patient Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* HERO: About Us (left) + Our Goal (right) */}
          <div className="mb-16 grid lg:grid-cols-2 gap-8 items-start">
            {/* Left: About Us */}
            <div>
              <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
                About Us
              </h1>
              <div
                className="space-y-4 text-[1.05rem] text-gray-700 leading-[1.9] max-w-6xl"
                style={{ textAlign: "justify" }}
              >
                <p>
                  At Serenity Rehabilitation Center, Inc., our mission is to
                  provide excellent, research-based care for individuals facing
                  substance use disorders (SUD) and mental health challenges. We
                  understand that SUD is a disease that can be fatal if
                  untreated, and we are dedicated to guiding individuals and
                  families toward recovery with compassion, dignity, and
                  respect.
                </p>
                <p>
                  Our programs include medication-assisted treatment, intensive
                  mental health services, and supportive counseling tailored to
                  the unique needs of each person. By combining therapeutic
                  interventions with family involvement, we create an
                  environment that fosters healing and growth.
                </p>
                <p>
                  We also serve as a resource to the community, working to
                  educate the public on addiction and advocating for the value
                  of treatment in improving overall wellness.
                </p>
                <p>
                  We deliver comprehensive care and counseling to patients in
                  need — ensuring that every step of the journey is supported
                  with expertise, compassion, and a commitment to helping
                  individuals reach their full potential.
                </p>
              </div>
            </div>

            {/* Right: Our Goal panel */}
            <Card className="bg-white rounded-2xl shadow-sm border-l-4 border-l-cyan-600">
              <CardContent className="p-6">
                <div className="inline-block rounded-md bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-800 mb-4">
                  OUR GOAL
                </div>
                <div
                  className="space-y-4 text-gray-700 leading-relaxed"
                  style={{ textAlign: "justify" }}
                >
                  <p>
                    Our Goal is to provide a high level therapeutic interventions
                    in a short period of time to consumers who are experiencing
                    severe levels of distress. Not limited to just children and
                    adolescents but adults too.
                  </p>
                  <p>
                    Services can be provided up to 6 hours per day working with
                    clinicians and their families on achieving goals identified
                    in their person centered treatment plans.
                  </p>
                  <p>
                    The philosophy is that individuals and their families
                    receive high quality intensive mental health care in the
                    least restricted environment and they attend the program to
                    learn proactive coping skills to empower the client to
                    enhance growth and to gain the necessary skills to reach
                    their full potential.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 2) Join Our Community of Hope and Recovery */}
          <AboutSection />

          {/* Mission Section */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
           
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                Our Values
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Heart className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
                  <span className="text-gray-700">
                    <strong>Compassion:</strong> We treat every individual with empathy and understanding
                  </span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
                  <span className="text-gray-700">
                    <strong>Safety:</strong> We provide a secure environment for healing and recovery
                  </span>
                </li>
                <li className="flex items-start">
                  <Users className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
                  <span className="text-gray-700">
                    <strong>Community:</strong> We believe in the power of peer support and connection
                  </span>
                </li>
                <li className="flex items-start">
                  <Award className="w-5 h-5 text-cyan-600 mr-3 mt-1" />
                  <span className="text-gray-700">
                    <strong>Excellence:</strong> We maintain the highest standards of care and treatment
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-indigo-600 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-serif font-bold mb-4">
              Join Our Community of Recovery
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Take the first step towards healing and transformation today.
            </p>
            <Button size="lg" asChild className="bg-white text-indigo-600 hover:bg-gray-100">
              <Link href="/intake">Start Your Journey</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
