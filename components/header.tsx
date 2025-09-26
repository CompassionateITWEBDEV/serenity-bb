"use client"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Heart, Menu, X } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"

export function Header() {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-3 text-xl font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              <Heart className="h-8 w-8 fill-current" />
              <span className="font-sans">Serenity Rehabilitation Center</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link 
              href="/services" 
              className="text-gray-700 hover:text-cyan-600 font-medium transition-colors"
            >
              Services
            </Link>
            <Link 
              href="/about" 
              className="text-gray-700 hover:text-cyan-600 font-medium transition-colors"
            >
              About
            </Link>
            <Link 
              href="/blog" 
              className="text-gray-700 hover:text-cyan-600 font-medium transition-colors"
            >
              Blog
            </Link>
            <Link 
              href="/contact" 
              className="text-gray-700 hover:text-cyan-600 font-medium transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button 
                    variant="outline" 
                    className="border-cyan-600 text-cyan-600 hover:bg-cyan-50 font-medium"
                  >
                    Patient Login
                  </Button>
                </Link>
                <Button 
                  onClick={handleLogout} 
                  variant="ghost" 
                  className="text-gray-600 hover:text-cyan-600 font-medium"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button 
                    variant="outline" 
                    className="border-cyan-600 text-cyan-600 hover:bg-cyan-50 font-medium"
                  >
                    Patient Login
                  </Button>
                </Link>
                <Link href="/intake">
                  <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium px-6">
                    Get Help Now
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-cyan-600"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 space-y-4">
            <div className="flex flex-col space-y-3">
              <Link 
                href="/services" 
                className="text-gray-700 hover:text-cyan-600 font-medium px-2 py-1 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Services
              </Link>
              <Link 
                href="/about" 
                className="text-gray-700 hover:text-cyan-600 font-medium px-2 py-1 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                href="/blog" 
                className="text-gray-700 hover:text-cyan-600 font-medium px-2 py-1 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link 
                href="/contact" 
                className="text-gray-700 hover:text-cyan-600 font-medium px-2 py-1 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
            </div>
            
            <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant="outline" 
                      className="w-full border-cyan-600 text-cyan-600 hover:bg-cyan-50 font-medium"
                    >
                      Patient Login
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }}
                    variant="ghost" 
                    className="w-full text-gray-600 hover:text-cyan-600 font-medium"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant="outline" 
                      className="w-full border-cyan-600 text-cyan-600 hover:bg-cyan-50 font-medium"
                    >
                      Patient Login
                    </Button>
                  </Link>
                  <Link href="/intake" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium">
                      Get Help Now
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
