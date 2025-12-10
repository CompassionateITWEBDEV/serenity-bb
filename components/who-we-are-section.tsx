"use client"
import { useEffect, useRef, useState } from "react"
import { Clock, Phone } from "lucide-react"
import Image from "next/image"

export function WhoWeAreSection() {
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
    <section ref={sectionRef} className={`who-we-are-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="who-we-are-container">
        <div className="who-we-are-grid">
          {/* Left Column - Image */}
          <div className="who-we-are-image-wrapper">
            <Image
              src="/peaceful-rehabilitation-center.png"
              alt="Rehabilitation facility environment in Pontiac Michigan"
              width={600}
              height={500}
              className="who-we-are-image"
            />
          </div>

          {/* Right Column - Content */}
          <div className="who-we-are-content">
            <div className="who-we-are-label">About Us</div>
            <h2 className="who-we-are-title">
              Trusted Addiction Recovery Programs Pontiac Focused on Long-Term Healing
            </h2>
            <p className="who-we-are-description">
              Our Addiction Recovery Programs Pontiac offer a structured pathway toward stability and sobriety. With a combination of medical support, counseling, therapy, and peer guidance, our Addiction Recovery Programs Pontiac help individuals rebuild their lives with confidence. Each of our Addiction Recovery Programs Pontiac is designed to empower long-term recovery and prevent relapse.
            </p>
            <p className="who-we-are-description">
              <strong>About Serenity Rehabilitation Center</strong><br/><br/>
              Located in the heart of Pontiac, Michigan, Serenity Rehabilitation Center is committed to restoring hope and transforming lives. Our team of psychiatrists, case managers, behavioral specialists, and recovery coaches work together to deliver high-quality, patient-focused care. We believe in honesty, compassion, and creating a safe environment for every person who walks through our doors.
            </p>
            <p className="who-we-are-description">
              <strong>A Rehabilitation Center in Pontiac Michigan You Can Rely On</strong><br/><br/>
              As a community-trusted Rehabilitation Center in Pontiac Michigan, we proudly support individuals dealing with addiction, mental health challenges, and behavioral concerns.
            </p>

            {/* Contact Information */}
            <div className="who-we-are-contact-info">
              <div className="contact-info-item">
                <div className="contact-icon-wrapper">
                  <Clock className="contact-icon" />
                </div>
                <div className="contact-info-content">
                  <div className="contact-info-label">Operating Hours</div>
                  <div className="contact-info-value">Everyday From 8:00 AM - 6:00 PM</div>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-icon-wrapper">
                  <Phone className="contact-icon" />
                </div>
                <div className="contact-info-content">
                  <div className="contact-info-label">Call To Ask A Question</div>
                  <a href="tel:+12488383686" className="contact-info-value">
                    (248) 838-3686
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .who-we-are-section {
          padding: 5rem 0;
          background: #f0fdfa;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .who-we-are-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .who-we-are-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 2rem;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .who-we-are-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .who-we-are-image-wrapper {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }

        .who-we-are-image {
          width: 100%;
          height: auto;
          object-fit: cover;
          border-radius: 16px;
        }

        .who-we-are-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .who-we-are-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0891b2;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .who-we-are-title {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.2;
          color: #1f2937;
          font-family: 'Georgia', 'Times New Roman', serif;
          margin-bottom: 1rem;
        }

        .who-we-are-description {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .who-we-are-description strong {
          color: #1f2937;
          font-weight: 600;
        }

        .who-we-are-contact-info {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .contact-info-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .contact-icon-wrapper {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .contact-icon {
          width: 24px;
          height: 24px;
          color: #ffffff;
        }

        .contact-info-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .contact-info-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .contact-info-value {
          font-size: 1.125rem;
          color: #1f2937;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .contact-info-value:hover {
          color: #0891b2;
        }

        @media (max-width: 1024px) {
          .who-we-are-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .who-we-are-image-wrapper {
            order: 1;
          }

          .who-we-are-content {
            order: 2;
          }

          .who-we-are-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 640px) {
          .who-we-are-section {
            padding: 3rem 0;
          }

          .who-we-are-title {
            font-size: 1.75rem;
          }

          .who-we-are-description {
            font-size: 1rem;
          }
        }
      `}</style>
    </section>
  )
}

