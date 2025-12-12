// components/footer.tsx
import Link from "next/link";
import Image from "next/image";
import { LocationMap } from "@/components/location-map";

export function Footer() {
  const year = new Date().getFullYear(); // why: keeps copyright current
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 py-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src="/2023-08-15 - Copy.png"
                  alt="Serenity Rehabilitation Center Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <h3 className="text-2xl font-serif font-bold text-cyan-400">
                Serenity Rehabilitation Center
              </h3>
            </Link>
            <p className="text-gray-300 leading-relaxed mb-4">
              Dedicated to helping individuals reclaim health and hope through personalized treatment, supportive counseling, and evidence-based care. At Serenity Rehabilitation Center, your healing journey is our mission.
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Licensed Medical Facility • Accredited by Joint Commission
            </p>
            <div className="mt-6">
              <h4 className="font-semibold text-white mb-3">We Proudly Serve</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-300">
                <div>📍 Pontiac, Michigan</div>
                <div>📍 Auburn Hills</div>
                <div>📍 Waterford Township</div>
                <div>📍 Bloomfield Hills</div>
                <div>📍 Rochester Hills</div>
                <div>📍 Sylvan Lake</div>
                <div>📍 Lake Angelus</div>
                <div>📍 Orion Township</div>
                <div>📍 West Bloomfield</div>
                <div>📍 Clarkston</div>
                <div>📍 Madison Heights</div>
                <div>📍 Troy</div>
              </div>
            </div>
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
            <div className="mt-6">
              <h4 className="font-semibold text-white mb-3">Accepted Insurance</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-cyan-400 mb-1">In Network</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    HAP, UHC, AETNA BETTER HEALTH, BCBS, BCBSM, BCN, MCLAREN, AMERIHEALTH CARITAS, CIGNA, MERIDIAN COMPLETE, WELLCARE, PRIORITY HEALTH PLAN, MOLINA, OPTUM VA CCN, AMBETTER, ZING, ZING HEALTH PLAN, NGS, MEDICAID
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-cyan-400 mb-1">Out of Network</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    HUMANA, AETNA, HAP CARESOURCE, BCC - IN PROCESS, ALIGN SENIOR PLUS
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <div className="space-y-3 text-gray-300 text-sm">
              <div>
                <p className="font-medium text-white mb-1">Address</p>
                <p>35 S Johnson Ave</p>
                <p>Pontiac, MI 48341</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Phone</p>
                <p>
                  Main: <a href="tel:+12488383686" className="text-cyan-400 hover:underline">(248) 838-3686</a>
                </p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Fax</p>
                <p>(248) 838-3686</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Email</p>
                <p>
                  <a href="mailto:info@src.health" className="text-cyan-400 hover:underline">info@src.health</a>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-gray-300 text-xs">24/7 Crisis Support Available</p>
              <p className="text-gray-400 text-xs mt-1">If this is a medical emergency, call 911 immediately.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 pb-8 text-center text-gray-400">
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

      {/* Map Section - Bottom (Rectangular) */}
      <div className="w-full h-96 bg-gray-900">
        <LocationMap
          address="35 S Johnson Ave, Pontiac, MI 48341"
          latitude={42.63471}
          longitude={-83.30854}
          height="100%"
        />
      </div>
    </footer>
  );
}
