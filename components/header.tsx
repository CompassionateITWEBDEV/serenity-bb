"use client"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
export function Header() {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const handleLogout = () => {
    logout()
    router.push("/")
  }
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-9xl mx-auto px-5 sm:px-6 lg:px-8 border-b border-slate-300">

improve the header base on the image that make some adjustmesnts
        <div className="flex items-center justify-between h-16 pt-px">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2 text-2xl font-serif font-bold text-cyan-600 hover:text-indigo-500 transition-colors"
            >
              <Heart className="h-10 w-10" />
              <span>Serenity Rehabilitation Center</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/services" className="text-gray-600 hover:text-cyan-600 transition-colors">
              Services
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-cyan-600 transition-colors">
              About
            </Link>
            <Link href="/blog" className="text-gray-600 hover:text-cyan-600 transition-colors">
              Blog
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-cyan-600 transition-colors">
              Contact
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50 bg-transparent">
                    Patient Login
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost" className="text-gray-600 hover:text-cyan-600">
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50 bg-transparent">
                    Patient Login
                  </Button>
                </Link>
                <Link href="/intake">
                  <Button className="bg-cyan-600 hover:bg-indigo-500 text-white transition-colors">Get Help Now</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
