"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface PageFadeWrapperProps {
  children: ReactNode
  className?: string
}

export function PageFadeWrapper({ children, className = "" }: PageFadeWrapperProps) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fade in immediately on mount (page load)
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)

    // Also observe for scroll-based fade (backup)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      clearTimeout(timer)
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  return (
    <div 
      ref={sectionRef} 
      className={`transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-[30px]'
      } ${className}`}
      style={{ transitionDuration: '800ms' }}
    >
      {children}
    </div>
  )
}

