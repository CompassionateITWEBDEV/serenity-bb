// components/footer.tsx
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear(); // why: keeps copyright current
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-serif font-bold text-cyan-400 mb-4">
              Serenity Rehabilitation Center
            </h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Dedicated to helping individuals reclaim health and hope through personalized treatment, supportive counseling, and evidence-based care. At Serenity Rehabilitation Center, your healing journey is our mission.
            </p>
            <p className="text-sm text-gray-400">
              Licensed Medical Facility • Accredited by Joint Commission
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/services" className="hover:text-cyan-400 transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-cyan-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cyan-400 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-cyan-400 transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Emergency</h4>
            <a href="tel:+12488383686" className="text-cyan-400 font-bold text-lg hover:underline">
              (248) 838-3686
            </a>
            <p className="text-gray-300 text-sm mt-2">24/7 Crisis Support</p>
            <p className="text-gray-300 text-sm mt-4">If this is a medical emergency, call 911 immediately.</p>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>
            © {year} Serenity Rehabilitation Center. All rights reserved.{" "}
            {/* link placeholders if you add these pages later */}
            <span className="mx-2">|</span>
            <Link href="/privacy" className="hover:text-cyan-400">Privacy Policy</Link>
            <span className="mx-2">|</span>
            <Link href="/terms" className="hover:text-cyan-400">Terms of Service</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
