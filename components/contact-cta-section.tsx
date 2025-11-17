"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Phone } from "lucide-react"

export function ContactCTASection() {
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

  return (
    <section ref={sectionRef} className={`contact-cta-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="contact-cta-container">
        <div className="contact-cta-grid">
          {/* Left Column - Image */}
          <div className="contact-cta-image-wrapper">
            <Image
              src="/rehabilitation-compassionate-care.png"
              alt="Compassionate rehabilitation care"
              width={600}
              height={500}
              className="contact-cta-image"
            />
          </div>

          {/* Right Column - Content */}
          <div className="contact-cta-content">
            <h2 className="contact-cta-title">
              We Take Care Of Your Health & Keep You On The Path To Recovery Day By Day
            </h2>
            <p className="contact-cta-subtitle">
              It's Time To Start Your Journey. Call To Get Started.
            </p>

            <div className="contact-cta-phone">
              <div className="phone-icon-wrapper">
                <Phone className="phone-icon" />
              </div>
              <a href="https://wa.me/12488383686" target="_blank" rel="noopener noreferrer" className="phone-number">
                (248) 838-3686
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .contact-cta-section {
          padding: 5rem 0;
          background: #f0fdfa;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .contact-cta-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .contact-cta-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .contact-cta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .contact-cta-image-wrapper {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }

        .contact-cta-image {
          width: 100%;
          height: auto;
          object-fit: cover;
          border-radius: 16px;
        }

        .contact-cta-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .contact-cta-title {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.2;
          color: #1f2937;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        .contact-cta-subtitle {
          font-size: 1.25rem;
          line-height: 1.7;
          color: #6b7280;
        }

        .contact-cta-phone {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .phone-icon-wrapper {
          width: 80px;
          height: 80px;
          background: #0891b2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
        }

        .phone-icon {
          width: 40px;
          height: 40px;
          color: #ffffff;
        }

        .phone-number {
          font-size: 2rem;
          font-weight: 700;
          color: #0891b2;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .phone-number:hover {
          color: #0e7490;
        }

        @media (max-width: 1024px) {
          .contact-cta-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .contact-cta-image-wrapper {
            order: 1;
          }

          .contact-cta-content {
            order: 2;
            text-align: center;
          }

          .contact-cta-title {
            font-size: 2rem;
          }

          .contact-cta-phone {
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .contact-cta-section {
            padding: 3rem 0;
          }

          .contact-cta-container {
            padding: 0 1rem;
          }

          .contact-cta-title {
            font-size: 1.75rem;
          }

          .contact-cta-subtitle {
            font-size: 1.125rem;
          }

          .phone-icon-wrapper {
            width: 64px;
            height: 64px;
          }

          .phone-icon {
            width: 32px;
            height: 32px;
          }

          .phone-number {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </section>
  )
}

