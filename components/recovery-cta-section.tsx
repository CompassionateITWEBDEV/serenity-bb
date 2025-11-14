"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

export function RecoveryCTASection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const router = useRouter()

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
    <section ref={sectionRef} className={`recovery-cta-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="recovery-cta-overlay"></div>
      <div className="recovery-cta-container">
        <div className="recovery-cta-content">
          <h2 className="recovery-cta-title">
            Let Us Help You On Your Journey To Recovery
          </h2>
          <div className="recovery-cta-buttons">
            <button 
              onClick={() => router.push("/services")}
              className="recovery-cta-button recovery-cta-button-primary"
            >
              View Services
            </button>
            <button 
              onClick={() => router.push("/contact")}
              className="recovery-cta-button recovery-cta-button-secondary"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .recovery-cta-section {
          position: relative;
          padding: 5rem 0;
          background: linear-gradient(135deg, #0e7490 0%, #0891b2 100%);
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
          overflow: hidden;
        }

        .recovery-cta-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .recovery-cta-overlay {
          position: absolute;
          inset: 0;
          background-image: url('/professional-nurse-caring-for-patient-in-modern-he.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.15;
          z-index: 1;
        }

        .recovery-cta-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          position: relative;
          z-index: 2;
        }

        .recovery-cta-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 3rem;
        }

        .recovery-cta-title {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1.2;
          color: #ffffff;
          font-family: 'Georgia', 'Times New Roman', serif;
          flex: 1;
        }

        .recovery-cta-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex-shrink: 0;
        }

        .recovery-cta-button {
          padding: 1.5rem 3rem;
          font-size: 1.25rem;
          font-weight: 700;
          border-radius: 12px;
          transition: all 0.3s ease;
          display: inline-block;
          text-align: center;
          font-family: 'Stack Sans Headline', sans-serif;
          min-width: 220px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          -webkit-appearance: none;
          appearance: none;
          border: 3px solid;
        }

        .recovery-cta-button:active {
          transform: translateY(0);
        }

        .recovery-cta-button-primary {
          background: #10b981 !important;
          color: #ffffff !important;
          border-color: #10b981 !important;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4) !important;
        }

        .recovery-cta-button-primary:hover {
          background: #059669 !important;
          border-color: #059669 !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5) !important;
        }

        .recovery-cta-button-secondary {
          background: #0e7490 !important;
          color: #ffffff !important;
          border-color: #0e7490 !important;
          box-shadow: 0 6px 20px rgba(14, 116, 144, 0.4) !important;
        }

        .recovery-cta-button-secondary:hover {
          background: #155e75 !important;
          border-color: #155e75 !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(14, 116, 144, 0.5) !important;
        }

        @media (max-width: 1024px) {
          .recovery-cta-content {
            flex-direction: column;
            text-align: center;
            gap: 2rem;
          }

          .recovery-cta-title {
            font-size: 2.5rem;
          }

          .recovery-cta-buttons {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .recovery-cta-section {
            padding: 3rem 0;
          }

          .recovery-cta-container {
            padding: 0 1rem;
          }

          .recovery-cta-title {
            font-size: 2rem;
          }

          .recovery-cta-buttons {
            flex-direction: column;
            width: 100%;
          }

          .recovery-cta-button {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </section>
  )
}

