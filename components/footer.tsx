export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <h3 className="text-2xl font-serif font-bold text-cyan-400 mb-4">Serenity Rehabilitation Center</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Dedicated to providing compassionate, comprehensive care for individuals and families affected by lead
              poisoning. Your recovery is our mission.
            </p>
            <p className="text-sm text-gray-400">Licensed Medical Facility • Accredited by Joint Commission</p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="#services" className="hover:text-cyan-400 transition-colors">
                  Services
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-cyan-400 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-cyan-400 transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-400 transition-colors">
                  Insurance
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Emergency</h4>
            <p className="text-cyan-400 font-bold text-lg">(248)-838-3686</p>
            <p className="text-gray-300 text-sm mt-2">24/7 Crisis Support</p>
            <p className="text-gray-300 text-sm mt-4">If this is a medical emergency, call 911 immediately.</p>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2025 Serenity Rehabilitation Center. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </div>
    </footer>
  )
}
