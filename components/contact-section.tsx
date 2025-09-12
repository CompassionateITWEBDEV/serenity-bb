import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ContactSection() {
  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Contact Us for Support – We're Here for You
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Take the first step towards recovery. Our compassionate team is ready to help you begin your healing journey
            today.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📞</span>
              </div>
              <CardTitle className="font-serif text-gray-900">Call Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Speak with our intake specialists</p>
              <p className="text-2xl font-bold text-cyan-600">(555) 123-HELP</p>
              <p className="text-sm text-gray-500 mt-2">Available 24/7</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <CardTitle className="font-serif text-gray-900">Email Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Send us your questions</p>
              <p className="text-lg font-semibold text-cyan-600">help@serenityrehab.com</p>
              <p className="text-sm text-gray-500 mt-2">Response within 2 hours</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📍</span>
              </div>
              <CardTitle className="font-serif text-gray-900">Visit Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Come see our facility</p>
              <p className="text-gray-700">
                123 Healing Way
                <br />
                Serenity City, SC 12345
              </p>
              <p className="text-sm text-gray-500 mt-2">Open Mon-Fri 8AM-6PM</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            className="bg-indigo-500 hover:bg-cyan-600 text-white px-12 py-4 text-lg transition-all duration-300 transform hover:scale-105"
          >
            Schedule Your Free Consultation
          </Button>
        </div>
      </div>
    </section>
  )
}
