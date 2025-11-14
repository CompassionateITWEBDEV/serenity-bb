"use client"
import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSwal } from "@/lib/sweetalert"

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    const fd = new FormData(e.currentTarget)
    const name = ((fd.get("name") as string) || "").trim()
    const nameParts = name.split(" ").filter(Boolean)
    const first_name = nameParts[0] || ""
    const last_name = nameParts.slice(1).join(" ") || ""
    const hasPhone = Boolean((fd.get("phone") as string | null)?.trim())
    const payload = {
      first_name,
      last_name: last_name || first_name,
      email: ((fd.get("email") as string) || "").trim(),
      phone: ((fd.get("phone") as string) || "").trim(),
      subject: "",
      message: ((fd.get("message") as string) || "").trim(),
      contact_method: hasPhone ? "phone" : "email",
      source: "features_section",
    }

    if (!payload.first_name || !payload.email || !payload.message) {
      getSwal()?.fire({
        icon: "warning",
        title: "Missing fields",
        text: "Name, email and message are required.",
      })
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.text()) || "Submission failed")

      getSwal()?.fire({
        icon: "success",
        title: "Message sent",
        text: "Thanks for reaching out. We'll contact you shortly.",
        confirmButtonColor: "#06b6d4",
      })
      ;(e.currentTarget as HTMLFormElement).reset()
    } catch (err) {
      getSwal()?.fire({
        icon: "error",
        title: "Could not send",
        text: err instanceof Error ? err.message : "Please try again.",
      })
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const features = [
    "Comprehensive Treatment Programs",
    "Licensed Medical Professionals",
    "24/7 Support Available",
    "Personalized Care Plans",
    "Evidence-Based Therapies",
    "Family-Centered Approach"
  ]

  return (
    <section ref={sectionRef} className={`features-section ${isVisible ? 'fade-in-visible' : ''}`}>
      <div className="features-container">
        <div className="features-grid">
          {/* Left Column - Contact Form */}
          <div className="features-form-wrapper">
            <form onSubmit={handleSubmit} className="features-form">
              <h3 className="features-form-title">Send Us a Message</h3>
              <div className="features-form-group">
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="features-form-input"
                  placeholder="Name"
                />
              </div>
              <div className="features-form-group">
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="features-form-input"
                  placeholder="Email"
                />
              </div>
              <div className="features-form-group">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="features-form-input"
                  placeholder="Phone Number"
                />
              </div>
              <div className="features-form-group">
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="features-form-textarea"
                  placeholder="Message"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="features-form-button"
              >
                {submitting ? "Sending..." : "SEND A MESSAGE"}
              </button>
            </form>
          </div>

          {/* Right Column - Content */}
          <div className="features-content">
            <h2 className="features-title">
              Transform Your Life Through Comprehensive Recovery
            </h2>
            <p className="features-description">
              At Serenity Rehabilitation Center, we provide comprehensive care that addresses all aspects of your recovery journey. Our evidence-based approach ensures you receive the highest quality treatment.
            </p>

            <div className="features-list">
              {features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <Check className="feature-icon" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => router.push("/contact")}
              className="features-button"
            >
              Read More
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .features-section {
          padding: 5rem 0;
          background: #f0fdfa;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .features-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .features-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 2rem;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .features-form-wrapper {
          background: #ffffff;
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .features-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .features-form-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1.5rem;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        .features-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .features-form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .features-form-input,
        .features-form-textarea {
          padding: 0.875rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
          font-family: inherit;
          background: #f9fafb;
          color: #1f2937;
          width: 100%;
        }

        .features-form-input::placeholder,
        .features-form-textarea::placeholder {
          color: #9ca3af;
        }

        .features-form-input:focus,
        .features-form-textarea:focus {
          outline: none;
          border-color: #0891b2;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.1);
        }

        .features-form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .features-form-button {
          padding: 1rem 2rem;
          font-size: 1rem;
          font-weight: 700;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0.5rem;
        }

        .features-form-button:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .features-form-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .features-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .features-title {
          font-size: 2.25rem;
          font-weight: 800;
          line-height: 1.3;
          color: #1f2937;
          font-family: 'Georgia', 'Times New Roman', serif;
          margin-bottom: 1rem;
        }

        .features-description {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.05rem;
          color: #1f2937;
          font-weight: 500;
        }

        .feature-icon {
          width: 24px;
          height: 24px;
          color: #ffffff;
          background-color: #95C4C5;
          border-radius: 50%;
          padding: 4px;
          flex-shrink: 0;
        }

        .features-button {
          display: inline-flex;
          align-items: center;
          padding: 0.875rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background: #0891b2;
          border: 3px solid #0891b2;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
          width: fit-content;
          box-shadow: 0 2px 4px rgba(8, 145, 178, 0.2);
        }

        .features-button:hover {
          background: #0e7490;
          border-color: #0e7490;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
        }

        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .features-form-wrapper {
            order: 1;
          }

          .features-content {
            order: 2;
          }

          .features-title {
            font-size: 2rem;
          }

          .features-form-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .features-section {
            padding: 3rem 0;
          }

          .features-container {
            padding: 2rem 1rem;
          }

          .features-title {
            font-size: 1.75rem;
          }

          .features-description {
            font-size: 1rem;
          }

          .features-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  )
}

