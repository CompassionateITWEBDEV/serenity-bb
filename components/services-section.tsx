import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ServicesSection() {
  const services = [
    {
      title: "Lead Detoxification",
      description: "Safe and effective removal of lead from your system using proven medical protocols.",
      icon: "🔬",
    },
    {
      title: "Nutritional Therapy",
      description: "Specialized nutrition plans to support your body's natural healing processes.",
      icon: "🥗",
    },
    {
      title: "Cognitive Rehabilitation",
      description: "Targeted therapies to address cognitive effects of lead exposure.",
      icon: "🧠",
    },
    {
      title: "Family Support",
      description: "Comprehensive support services for families affected by lead poisoning.",
      icon: "👨‍👩‍👧‍👦",
    },
    {
      title: "Environmental Assessment",
      description: "Professional evaluation of your living and working environments.",
      icon: "🏠",
    },
    {
      title: "Long-term Monitoring",
      description: "Ongoing health monitoring to ensure sustained recovery and wellness.",
      icon: "📊",
    },
  ]

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">Discover Our Treatment Options</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive approach to lead poisoning recovery combines medical expertise with compassionate care to
            address every aspect of your healing journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-gray-200"
            >
              <CardHeader className="text-center">
                <div className="text-4xl mb-4">{service.icon}</div>
                <CardTitle className="text-xl font-serif text-gray-900">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-center leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
