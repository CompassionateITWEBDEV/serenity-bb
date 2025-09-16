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
            <h2 className="text-4xl font-serif font-bold text-gray-900">Join Our Community of Hope and Recovery</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              For over 15 years, Serenity Rehabilitation Center has been a beacon of hope for individuals and families
              affected by lead poisoning. Our multidisciplinary team of medical professionals, nutritionists, and
              counselors work together to create personalized treatment plans that address your unique needs.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">500+</h3>
                <p className="text-gray-600">Successful Recoveries</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-2xl font-bold text-cyan-600 mb-2">15+</h3>
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
  )
}
