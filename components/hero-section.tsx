"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-cyan-50 to-indigo-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-6xl font-serif font-bold text-gray-900 leading-tight">
              Restoring Lives, One Recovery at a Time
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              At Serenity Rehabilitation Center, we believe in the power of healing. Our dedicated team is committed to
              providing personalized care for those affected by lead exposure, guiding you towards a brighter, healthier
              future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSfbECwxl06fOsIvhDnPxK-Fr98ysUeDFwjlODgCK1NpEM4L-Q/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="bg-cyan-600 hover:bg-indigo-500 text-white px-8 py-4 text-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                >
                  Community Health Worker
                </Button>
              </a>
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 text-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                >
                  Patient Portal Access
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src="/professional-nurse-caring-for-patient-in-modern-he.jpg"
              alt="Professional nurse caring for patient in modern healthcare facility"
              className="rounded-2xl shadow-2xl"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                  <span className="text-cyan-600 font-bold text-xl">24/7</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Support Available</p>
                  <p className="text-sm text-gray-600">We're here when you need us</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
