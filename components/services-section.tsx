"use client"
import { useEffect, useRef, useState } from "react"
import { MessageCircle, Heart, Pill, Truck, Eye } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

export function ServicesSection() {
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

  const services = [
    {
      icon: MessageCircle,
      category: "Evaluation",
      title: "Psychiatric Evaluation",
      description: "Comprehensive mental health assessments and psychiatric diagnosis to create personalized treatment plans.",
      image: "/counselor.png",
      link: "/services/psychiatric-evaluation"
    },
    {
      icon: Heart,
      category: "Management",
      title: "Case Management",
      description: "Behavioral Health and Medical Case Management services coordinating your care across all treatment providers.",
      image: "/diverse-nurses-team.png",
      link: "/services/case-management"
    },
    {
      icon: Heart,
      category: "Support",
      title: "Peer Recovery Support",
      description: "Peer support and mentorship services from trained specialists with lived recovery experience.",
      image: "/empathetic-help.png",
      link: "/services/peer-recovery-support"
    },
    {
      icon: Pill,
      category: "Treatment",
      title: "Methadone Treatment",
      description: "Medically supervised methadone treatment program for opioid addiction recovery with counseling support.",
      image: "/caring-doctor.png",
      link: "/services/methadone"
    },
    {
      icon: Pill,
      category: "Treatment",
      title: "Suboxone Treatment",
      description: "Safe, effective Suboxone (Subox) treatment for opioid addiction recovery with medication-assisted care.",
      image: "/happy-doctor-consultation.png",
      link: "/services/suboxone"
    },
    {
      icon: Pill,
      category: "Treatment",
      title: "Naltrexone & Antabuse",
      description: "Naltrexone and Antabuse treatment for alcohol and opioid addiction recovery.",
      image: "/caring-nurse-helping-patient-in-medical-setting.jpg",
      link: "/services/naltrexone-antabuse"
    },
    {
      icon: Pill,
      category: "Management",
      title: "Medication Management",
      description: "Psychiatric and primary care medication management services for safe, effective treatment coordination.",
      image: "/What-is-Rehab-scaled.jpg",
      link: "/services/medication-management"
    },
    {
      icon: Heart,
      category: "Care",
      title: "Primary Care Services",
      description: "Comprehensive primary care services including general health, preventive care, and chronic disease management.",
      image: "/istockphoto-932074828-612x612.jpg",
      link: "/services/primary-care"
    },
    {
      icon: MessageCircle,
      category: "Emergency",
      title: "Emergency Dosing",
      description: "Urgent medication dosing services. Schedule online or call immediately for emergency medication access when you need it most.",
      image: "/caring-doctor.png",
      link: "/services/emergency-dosing"
    },
    {
      icon: Eye,
      category: "Compliance",
      title: "Directly Observed Therapy (DOT)",
      description: "Supervised medication administration to ensure treatment compliance. Professional medication monitoring for substance use treatment programs.",
      image: "/caring-doctor.png",
      link: "/services/directly-observed-therapy"
    },
    {
      icon: Truck,
      category: "Certification",
      title: "DOT Physicals",
      description: "Department of Transportation physical examinations for commercial drivers. FMCSA certified medical exams. Schedule your DOT physical today.",
      image: "/caring-doctor.png",
      link: "/services/dot-physicals"
    }
  ]

  return (
    <section ref={sectionRef} className={`services-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="services-container">
        <div className="services-header">
          <div className="services-label">Our Services</div>
          <h2 className="services-title">
            Our Core Treatment & Support Services
          </h2>
          <p className="services-description">
            We offer comprehensive, evidence-based services designed to support your journey to recovery and long-term healing.
          </p>
        </div>

        <div className="services-grid">
          {services.map((service, index) => {
            const IconComponent = service.icon
            return (
              <div key={index} className="service-card">
                <div className="service-image-wrapper">
                  <Image
                    src={service.image}
                    alt={service.title}
                    width={400}
                    height={250}
                    className="service-image"
                  />
                </div>
                <div className="service-icon-wrapper">
                  <IconComponent className="service-icon" />
                </div>
                <div className="service-category">{service.category}</div>
                <h3 className="service-title">{service.title}</h3>
                <p className="service-description">{service.description}</p>
                <button 
                  onClick={() => router.push(service.link)}
                  className="service-button"
                >
                  View Service Details
                </button>
              </div>
            )
          })}
        </div>
        
        <div className="services-cta">
          <button 
            onClick={() => router.push("/services")}
            className="services-cta-button"
          >
            View All Services →
          </button>
        </div>
      </div>

      <style jsx>{`
        .services-section {
          padding: 5rem 0;
          background: #f0fdfa;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .services-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .services-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 2rem;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .services-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .services-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0891b2;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }

        .services-title {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.2;
          color: #1f2937;
          font-family: 'Georgia', 'Times New Roman', serif;
          margin-bottom: 1.5rem;
        }

        .services-description {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #6b7280;
          max-width: 800px;
          margin: 0 auto;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .service-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .service-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: #0891b2;
        }

        .service-image-wrapper {
          width: 100%;
          height: 200px;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .service-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .service-icon-wrapper {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: -32px auto 1rem;
          position: relative;
          z-index: 1;
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
        }

        .service-icon {
          width: 32px;
          height: 32px;
          color: #ffffff;
        }

        .service-category {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0891b2;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .service-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        .service-description {
          font-size: 1rem;
          line-height: 1.7;
          color: #6b7280;
          margin-bottom: 1.5rem;
          flex: 1;
        }

        .service-button {
          width: 100%;
          background: #0891b2;
          color: white;
          border: 3px solid #0891b2;
          padding: 0.875rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: block;
          box-shadow: 0 2px 4px rgba(8, 145, 178, 0.2);
        }

        .service-button:hover {
          background: #0e7490;
          border-color: #0e7490;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
        }

        .services-cta {
          text-align: center;
          margin-top: 3rem;
        }

        .services-cta-button {
          background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%);
          color: white;
          border: none;
          padding: 1rem 2.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1.125rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
        }

        .services-cta-button:hover {
          background: linear-gradient(135deg, #0e7490 0%, #0284c7 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(8, 145, 178, 0.4);
        }

        @media (max-width: 1024px) {
          .services-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .services-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 640px) {
          .services-section {
            padding: 3rem 0;
          }

          .services-container {
            padding: 2rem 1rem;
          }

          .services-title {
            font-size: 1.75rem;
          }

          .services-description {
            font-size: 1rem;
          }
        }
      `}</style>
    </section>
  )
}

