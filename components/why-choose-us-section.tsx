"use client"
import { useEffect, useRef, useState } from "react"
import { Check, Shield, Heart, Clock, Users, Award } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

export function WhyChooseUsSection() {
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

  const benefits = [
    "Licensed psychiatrists & mental health professionals",
    "Affordable and accessible treatment options",
    "Holistic, evidence-based programs",
    "Supportive, judgement-free environment",
    "Personalized recovery plans",
    "Coordination with hospitals & community resources",
    "Long-term follow-up & continuity of care",
    "Brain games in patient portal for therapeutic support",
    "Home Health Notify - 24/7 communication system",
    "Referral management features for seamless care coordination",
    "Patient sustain care team 24/7"
  ]

  const sellingPoints = [
    {
      icon: Shield,
      title: "Licensed & Accredited",
      description: "Fully licensed medical facility with Joint Commission accreditation"
    },
    {
      icon: Heart,
      title: "Compassionate Care",
      description: "Dedicated team committed to your recovery and well-being"
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      description: "Convenient appointment times to fit your schedule"
    },
    {
      icon: Users,
      title: "Expert Team",
      description: "Experienced healthcare professionals with specialized training"
    },
    {
      icon: Award,
      title: "Proven Results",
      description: "Evidence-based treatments with high success rates"
    },
    {
      icon: Check,
      title: "Comprehensive Support",
      description: "Full spectrum of mental health and addiction recovery services"
    }
  ]

  return (
    <section ref={sectionRef} className={`why-choose-us-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="why-choose-us-container">
        <div className="why-choose-us-grid">
          {/* Left Column - Content */}
          <div className="why-choose-us-content">
            <div className="why-choose-us-label">Why Choose Us</div>
            <h2 className="why-choose-us-title">
              Why Choose Our Mental Health Services in Pontiac MI
            </h2>
            <p className="why-choose-us-description">
              Our Mental Health Services in Pontiac MI are designed to support individuals through emotional, behavioral, and psychological challenges. Backed by licensed clinicians and proven treatment methods, our Mental Health Services in Pontiac MI provide the right balance of structure, compassion, and clinical expertise. With a patient-first approach, our Mental Health Services in Pontiac MI ensure every individual receives care tailored to their unique needs.
            </p>

            <div className="why-choose-us-list">
              {benefits.map((benefit, index) => (
                <div key={index} className="why-choose-us-item">
                  <Check className="why-choose-us-icon" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => router.push("/services")}
              className="why-choose-us-button-primary"
            >
              Explore Our Treatment Approach →
            </button>
          </div>

          {/* Right Column - Image with Stats */}
          <div className="why-choose-us-image-wrapper">
            <Image
              src="/diverse-nurses-team.png"
              alt="Mental health professionals providing services in Pontiac MI"
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

        {/* Selling Points Section */}
        <div className="selling-points-section">
          <div className="selling-points-grid">
            {sellingPoints.map((point, index) => {
              const IconComponent = point.icon
              return (
                <div key={index} className="selling-point-card">
                  <div className="selling-point-icon-wrapper">
                    <IconComponent className="selling-point-icon" />
                  </div>
                  <h3 className="selling-point-title">{point.title}</h3>
                  <p className="selling-point-description">{point.description}</p>
                </div>
              )
            })}
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

        .why-choose-us-button-primary {
          margin-top: 1.5rem;
          display: inline-block;
          padding: 0.875rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          background: #0891b2;
          color: white;
          border: 2px solid #0891b2;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
          width: fit-content;
        }

        .why-choose-us-button-primary:hover {
          background: #0e7490;
          border-color: #0e7490;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
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

        /* Selling Points Section */
        .selling-points-section {
          margin-top: 4rem;
          padding-top: 3rem;
          border-top: 1px solid #e5e7eb;
        }

        .selling-points-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .selling-point-card {
          text-align: center;
          padding: 2rem 1.5rem;
          background: #f9fafb;
          border-radius: 12px;
          transition: all 0.3s ease;
          border: 1px solid #e5e7eb;
        }

        .selling-point-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(8, 145, 178, 0.15);
          border-color: #0891b2;
          background: #ffffff;
        }

        .selling-point-icon-wrapper {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
        }

        .selling-point-icon {
          width: 32px;
          height: 32px;
          color: #ffffff;
        }

        .selling-point-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.75rem;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        .selling-point-description {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #6b7280;
          margin: 0;
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

          .selling-points-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          .selling-points-section {
            margin-top: 3rem;
            padding-top: 2rem;
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

          .selling-points-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .selling-points-section {
            margin-top: 2rem;
            padding-top: 2rem;
          }

          .selling-point-card {
            padding: 1.5rem 1rem;
          }

          .selling-point-icon-wrapper {
            width: 56px;
            height: 56px;
            margin-bottom: 1rem;
          }

          .selling-point-icon {
            width: 28px;
            height: 28px;
          }

          .selling-point-title {
            font-size: 1.125rem;
          }

          .selling-point-description {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </section>
  )
}

