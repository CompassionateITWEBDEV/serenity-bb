"use client"
import { useEffect, useRef, useState } from "react"
import { Star } from "lucide-react"

export function TestimonialsSection() {
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

  const testimonials = [
    {
      name: "John Hardin",
      role: "Patient",
      content: "This place is amazing, I always like to see a underdog rise up and take the crown. The staff here are amazing and they treat you like family. This methadone clinic will get you in and dosed within 1 day, they also will pick you up and drop you off if you dont have a vehicle. Kristy is the best and is a sweetheart, shes always smiling and full of energy! Let's Go Serenity!!",
      rating: 5,
      date: "a year ago"
    },
    {
      name: "Angela Epperson",
      role: "Patient",
      content: "Most compassionate and caring staff! Ask for Eddie he is more of what the community needs a compassionate outreach affordable pricing with driving services available so happy to have a establishment with the staff and services they provide with affordable pricing.",
      rating: 5,
      date: "2 years ago"
    },
    {
      name: "Aaron Ryans",
      role: "Patient",
      content: "The staff is very professional and make you feel right at home.",
      rating: 5,
      date: "2 years ago"
    }
  ]

  return (
    <section ref={sectionRef} className={`testimonials-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="testimonials-container">
        {/* Header */}
        <div className="testimonials-header">
          <div className="testimonials-label">Testimonials</div>
          <h2 className="testimonials-title">
            What Our Patients Say About Us
          </h2>
          <p className="testimonials-description">
            Real stories from individuals who have found hope and healing through our comprehensive recovery programs.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="star-icon" fill="#fbbf24" />
                ))}
              </div>
              <p className="testimonial-content">
                "{testimonial.content}"
              </p>
              <div className="testimonial-author">
                <div className="author-image-wrapper">
                  <div className="author-initials">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <div className="author-info">
                  <div className="author-name">{testimonial.name}</div>
                  <div className="author-role">{testimonial.role} {testimonial.date && `• ${testimonial.date}`}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .testimonials-section {
          padding: 5rem 0;
          background: #f0fdfa;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .testimonials-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .testimonials-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 2rem;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .testimonials-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .testimonials-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0891b2;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }

        .testimonials-title {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.2;
          color: #1f2937;
          font-family: 'Georgia', 'Times New Roman', serif;
          margin-bottom: 1.5rem;
        }

        .testimonials-description {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #6b7280;
          max-width: 800px;
          margin: 0 auto;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .testimonial-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .testimonial-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: #0891b2;
        }

        .testimonial-rating {
          display: flex;
          gap: 0.25rem;
        }

        .star-icon {
          width: 20px;
          height: 20px;
          color: #fbbf24;
        }

        .testimonial-content {
          font-size: 1rem;
          line-height: 1.7;
          color: #6b7280;
          font-style: italic;
          flex: 1;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .author-image-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%);
        }

        .author-initials {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          text-transform: uppercase;
        }

        .author-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .author-name {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .author-role {
          font-size: 0.875rem;
          color: #6b7280;
        }

        @media (max-width: 1024px) {
          .testimonials-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .testimonials-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 640px) {
          .testimonials-section {
            padding: 3rem 0;
          }

          .testimonials-container {
            padding: 2rem 1rem;
          }

          .testimonials-title {
            font-size: 1.75rem;
          }

          .testimonials-description {
            font-size: 1rem;
          }
        }
      `}</style>
    </section>
  )
}

