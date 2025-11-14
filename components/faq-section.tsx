"use client"
import { useEffect, useRef, useState } from "react"
import { FAQAccordion } from "@/components/faq-accordion"
import Link from "next/link"

export function FAQSection() {
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

  const faqs = [
    {
      q: "Do you accept insurance?",
      a: "Yes. We accept Medicare, BCBS, Aetna, McLaren, HAP, and Zing. Contact us to verify your benefits.",
    },
    {
      q: "How soon can I start?",
      a: "Most patients can be assessed within 24–48 hours. Same-week starts are common.",
    },
    {
      q: "Are assessments confidential?",
      a: "Yes. All assessments are private and HIPAA-compliant.",
    },
    {
      q: "Do you offer personalized care plans?",
      a: "Yes. Our licensed clinicians design individualized rehabilitation plans based on your needs.",
    },
    {
      q: "What services do you provide?",
      a: "We offer counseling services, support services, and methadone treatment programs. Visit our Services page to learn more about each program.",
    },
    {
      q: "How do I schedule an appointment?",
      a: "You can schedule an appointment by calling us at (248) 838-3686 or by filling out our contact form on the Contact page.",
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
          <Link href="/faq" className="faq-link">
            View All FAQs →
          </Link>
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

        .faq-link {
          display: inline-block;
          font-size: 1rem;
          font-weight: 600;
          color: #0891b2;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .faq-link:hover {
          color: #0e7490;
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

