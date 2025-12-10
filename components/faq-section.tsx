"use client"
import { useEffect, useRef, useState } from "react"
import { FAQAccordion } from "@/components/faq-accordion"
import { useRouter } from "next/navigation"

export function FAQSection() {
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

  const faqs = [
    {
      q: "Do you accept walk-ins?",
      a: "Yes. Walk-ins and scheduled appointments are both welcome.",
    },
    {
      q: "Is your methadone program medically supervised?",
      a: "Yes, all medication-assisted treatments are supervised by licensed medical staff.",
    },
    {
      q: "Are your services confidential?",
      a: "Yes, every service follows HIPAA compliance and strict confidentiality.",
    },
    {
      q: "Do you help with long-term recovery planning?",
      a: "Absolutely — we provide ongoing support and continuity of care.",
    },
  ]

  return (
    <section ref={sectionRef} className={`faq-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="faq-container">
        <div className="faq-header">
          <div className="faq-label">Frequently Asked Questions</div>
          <h2 className="faq-title">
            Common Questions About Our Services
          </h2>
          <p className="faq-description">
            Find answers to the most common questions about our rehabilitation services, insurance coverage, and getting started.
          </p>
        </div>

        <div className="faq-content">
          <FAQAccordion faqs={faqs} />
        </div>

        <div className="faq-footer">
          <button 
            onClick={() => router.push("/faq")}
            className="faq-button"
          >
            View All FAQs →
          </button>
        </div>
      </div>

      <style jsx>{`
        .faq-section {
          padding: 5rem 0;
          background: #ffffff;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .faq-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .faq-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 2rem;
        }

        .faq-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .faq-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0891b2;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }

        .faq-title {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.2;
          color: #1f2937;
          font-family: 'Georgia', 'Times New Roman', serif;
          margin-bottom: 1.5rem;
        }

        .faq-description {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #6b7280;
          max-width: 800px;
          margin: 0 auto;
        }

        .faq-content {
          max-width: 900px;
          margin: 0 auto 2rem;
        }

        .faq-footer {
          text-align: center;
          margin-top: 3rem;
        }

        .faq-button {
          display: inline-block;
          padding: 0.875rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background: #0891b2;
          border: 3px solid #0891b2;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(8, 145, 178, 0.2);
        }

        .faq-button:hover {
          background: #0e7490;
          border-color: #0e7490;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
        }

        @media (max-width: 1024px) {
          .faq-title {
            font-size: 2rem;
          }

          .faq-container {
            padding: 2rem 1.5rem;
          }
        }

        @media (max-width: 640px) {
          .faq-section {
            padding: 3rem 0;
          }

          .faq-title {
            font-size: 1.75rem;
          }

          .faq-description {
            font-size: 1rem;
          }

          .faq-container {
            padding: 2rem 1rem;
          }
        }
      `}</style>
    </section>
  )
}

