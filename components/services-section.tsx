"use client"
import { useEffect, useRef, useState } from "react"
import { MessageCircle, Heart, Pill } from "lucide-react"
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
      category: "Counseling",
      title: "Counseling Services",
      description: "Professional counselors are available to help patients work through a wide variety of issues that they might be facing during their life experience. Comprehensive Counseling Programs Evidence-based counseling approaches tailored to your unique needs and recovery journey.",
      image: "/counselor.png",
      link: "/services/counseling"
    },
    {
      icon: Heart,
      category: "Support",
      title: "Support Services",
      description: "Holistic support services designed to help you maintain progress and achieve long-term recovery.",
      image: "/empathetic-help.png",
      link: "/services"
    },
    {
      icon: Pill,
      category: "Treatment",
      title: "Methadone Treatment",
      description: "Methadone is a long-acting opioid medication that is used as a pain reliever and, together with counseling and other psychosocial services, is used to treat individuals addicted to heroin and certain prescription drugs.",
      image: "/caring-doctor.png",
      link: "/services"
    }
  ]

  return (
    <section ref={sectionRef} className={`services-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="services-container">
        <div className="services-header">
          <div className="services-label">Our Services</div>
          <h2 className="services-title">
            Comprehensive Recovery Programs
          </h2>
          <p className="services-description">
            We offer a range of evidence-based services designed to support your journey to recovery.
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
                  Read More
                </button>
              </div>
            )
          })}
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

