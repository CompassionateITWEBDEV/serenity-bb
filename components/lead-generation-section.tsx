import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, MapPin, Mail } from "lucide-react"

export function LeadGenerationSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-cyan-100 text-cyan-800 mb-4">Licensed Addiction Treatment Center</Badge>
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
            Counseling & Methadone Dispensing Program
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
                <div className="w-6 h-6 bg-cyan-500 rounded-full"></div>
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
              <Button className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600">Learn More About Counseling</Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
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
              <Button className="w-full mt-4 bg-blue-500 hover:bg-blue-600">Get Treatment Information</Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
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
              <Button className="w-full mt-4 bg-green-500 hover:bg-green-600">Access Support Services</Button>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg p-8 mb-12">
          <h3 className="text-xl font-semibold text-center mb-8">Methadone Treatment Facts</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">40+</div>
              <div className="text-sm text-gray-600">Years of Research</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">75%</div>
              <div className="text-sm text-gray-600">Reduction in Crime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">60%</div>
              <div className="text-sm text-gray-600">Reduction in HIV Risk</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">24/7</div>
              <div className="text-sm text-gray-600">Support Available</div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
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
                  <div className="text-sm text-gray-600">673 Martin Luther King Jr
Blvd N, Pontiac, MI 48342</div>
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
                  <div className="text-sm font-medium text-red-800">24/7 Crisis Support</div>
                  <div className="text-sm text-red-600">Call 248-838-3656 for emergencies</div>
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
                    When scheduling a counseling session for the first time, clients can potentially be seen the same
                    day for an intake appointment, you will be seen by a full-time social worker.
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
                    Our intake coordinators are available to help you start your recovery journey today.
                  </p>
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-600">Call Now: (248)-838-3686</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
