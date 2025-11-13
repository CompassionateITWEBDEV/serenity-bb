"use client"
import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function WhyChooseUsSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  const benefits = [
    "Experienced Medical Team",
    "Personalized Treatment Plans",
    "Comprehensive Support Services",
    "Proven Recovery Methods"
  ]

  return (
    <section ref={sectionRef} className={`why-choose-us-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="why-choose-us-container">
        <div className="why-choose-us-grid">
          {/* Left Column - Content */}
          <div className="why-choose-us-content">
            <div className="why-choose-us-label">Why Choose Us</div>
            <h2 className="why-choose-us-title">
              Your Trusted Partner in Recovery
            </h2>
            <p className="why-choose-us-description">
              We are committed to providing exceptional care that goes beyond treatment. Our comprehensive approach ensures that every patient receives personalized attention and ongoing support.
            </p>

            <div className="why-choose-us-list">
              {benefits.map((benefit, index) => (
                <div key={index} className="why-choose-us-item">
                  <Check className="why-choose-us-icon" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <Link href="/about" className="why-choose-us-button">
              Learn More About Us
              <span className="button-arrow">→</span>
            </Link>
          </div>

          {/* Right Column - Image with Stats */}
          <div className="why-choose-us-image-wrapper">
            <Image
              src="/diverse-nurses-team.png"
              alt="Diverse healthcare team"
              width={600}
              height={500}
              className="why-choose-us-image"
            />
            <div className="why-choose-us-stats">
              <div className="stat-box">
                <div className="stat-number">3+</div>
                <div className="stat-label">Years Experience</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Support Available</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .why-choose-us-section {
          padding: 5rem 0;
          background: #f0fdfa;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .why-choose-us-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .why-choose-us-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 2rem;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .why-choose-us-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .why-choose-us-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .why-choose-us-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0891b2;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .why-choose-us-title {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.2;
          color: #1f2937;
          font-family: 'Georgia', 'Times New Roman', serif;
          margin-bottom: 1rem;
        }

        .why-choose-us-description {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .why-choose-us-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .why-choose-us-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.05rem;
          color: #1f2937;
          font-weight: 500;
        }

        .why-choose-us-icon {
          width: 24px;
          height: 24px;
          color: #ffffff;
          background-color: #95C4C5;
          border-radius: 50%;
          padding: 4px;
          flex-shrink: 0;
        }

        .why-choose-us-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          font-size: 1.125rem;
          font-weight: 600;
          background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%);
          color: white;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(8, 145, 178, 0.3);
          margin-top: 1rem;
        }

        .why-choose-us-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(8, 145, 178, 0.4);
          background: linear-gradient(135deg, #0e7490 0%, #0284c7 100%);
        }

        .button-arrow {
          font-size: 1.25rem;
          transition: transform 0.3s ease;
        }

        .why-choose-us-button:hover .button-arrow {
          transform: translateX(4px);
        }

        .why-choose-us-image-wrapper {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }

        .why-choose-us-image {
          width: 100%;
          height: auto;
          object-fit: cover;
          border-radius: 16px;
        }

        .why-choose-us-stats {
          position: absolute;
          bottom: 2rem;
          left: 2rem;
          display: flex;
          gap: 1rem;
        }

        .stat-box {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          min-width: 150px;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 800;
          color: #0891b2;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        @media (max-width: 1024px) {
          .why-choose-us-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .why-choose-us-content {
            text-align: center;
          }

          .why-choose-us-title {
            font-size: 2rem;
          }

          .why-choose-us-stats {
            position: relative;
            bottom: auto;
            left: auto;
            justify-content: center;
            margin-top: 2rem;
          }
        }

        @media (max-width: 640px) {
          .why-choose-us-section {
            padding: 3rem 0;
          }

          .why-choose-us-title {
            font-size: 1.75rem;
          }

          .why-choose-us-description {
            font-size: 1rem;
          }

          .why-choose-us-button {
            width: 100%;
            justify-content: center;
          }

          .why-choose-us-stats {
            flex-direction: column;
            align-items: center;
          }

          .stat-box {
            width: 100%;
            max-width: 200px;
          }
        }
      `}</style>
    </section>
  )
}

