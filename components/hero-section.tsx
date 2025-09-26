"use client"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <>
      <section className="hero-section">
        {/* Animated Background Elements */}
        <div className="hero-bg-animation">
          <div className="floating-orb orb-1"></div>
          <div className="floating-orb orb-2"></div>
          <div className="floating-orb orb-3"></div>
        </div>

        <div className="hero-container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-icon">🏥</span>
                <span>Leading Healthcare Excellence</span>
              </div>
              
              <h1 className="hero-title">
                <span className="title-highlight">Restoring Lives,</span>
                <br />
                <span className="title-gradient">One Recovery at a Time</span>
              </h1>
              
              <p className="hero-description">
                At Serenity Rehabilitation Center, we believe in the power of healing. Our dedicated team is committed to
                providing personalized care for those affected by lead exposure, guiding you towards a brighter, healthier
                future.
              </p>

              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-number">500+</div>
                  <div className="stat-label">Lives Restored</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">15+</div>
                  <div className="stat-label">Years Experience</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">24/7</div>
                  <div className="stat-label">Care Available</div>
                </div>
              </div>
              
              <div className="hero-buttons">
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSfbECwxl06fOsIvhDnPxK-Fr98ysUeDFwjlODgCK1NpEM4L-Q/viewform?usp=header"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary-link"
                >
                  <Button className="btn-primary">
                    <span className="btn-icon">👥</span>
                    Community Health Worker
                    <span className="btn-arrow">→</span>
                  </Button>
                </a>
                <Link href="/login" className="btn-secondary-link">
                  <Button className="btn-secondary">
                    <span className="btn-icon">🔐</span>
                    Patient Portal Access
                    <span className="btn-arrow">→</span>
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="hero-image-section">
              <div className="image-container">
                <div className="image-glow"></div>
                <img
                  src="/professional-nurse-caring-for-patient-in-modern-he.jpg"
                  alt="Professional nurse caring for patient in modern healthcare facility"
                  className="hero-image"
                />
                
                {/* Floating Cards */}
                <div className="floating-card card-support">
                  <div className="card-icon">
                    <span>24/7</span>
                  </div>
                  <div className="card-content">
                    <p className="card-title">Support Available</p>
                    <p className="card-subtitle">We're here when you need us</p>
                  </div>
                  <div className="card-pulse"></div>
                </div>

                <div className="floating-card card-success">
                  <div className="card-icon success-icon">
                    <span>✓</span>
                  </div>
                  <div className="card-content">
                    <p className="card-title">98% Success Rate</p>
                    <p className="card-subtitle">Proven results</p>
                  </div>
                </div>

                <div className="floating-card card-team">
                  <div className="card-icon team-icon">
                    <span>👨‍⚕️</span>
                  </div>
                  <div className="card-content">
                    <p className="card-title">Expert Team</p>
                    <p className="card-subtitle">Certified professionals</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="hero-decorative">
          <div className="deco-cross deco-cross-1">+</div>
          <div className="deco-cross deco-cross-2">+</div>
          <div className="deco-circle deco-circle-1"></div>
          <div className="deco-circle deco-circle-2"></div>
        </div>
      </section>

      <style jsx global>{`
        /* Hero Section Base Styles */
        .hero-section {
          position: relative;
          background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 25%, #f0f9ff 50%, #f3f4f6 75%, #fdf4ff 100%);
          padding: 5rem 0 6rem 0;
          overflow: hidden;
          min-height: 90vh;
          display: flex;
          align-items: center;
        }

        /* Animated Background */
        .hero-bg-animation {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .floating-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          animation: floatOrb 12s ease-in-out infinite;
          opacity: 0.4;
        }

        .orb-1 {
          width: 300px;
          height: 300px;
          background: linear-gradient(45deg, #06b6d4, #3b82f6);
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, #8b5cf6, #06b6d4);
          top: 60%;
          right: 20%;
          animation-delay: 4s;
        }

        .orb-3 {
          width: 150px;
          height: 150px;
          background: linear-gradient(45deg, #f59e0b, #ef4444);
          bottom: 20%;
          left: 30%;
          animation-delay: 8s;
        }

        @keyframes floatOrb {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.3; 
          }
          33% { 
            transform: translate(30px, -30px) rotate(120deg); 
            opacity: 0.6; 
          }
          66% { 
            transform: translate(-20px, 20px) rotate(240deg); 
            opacity: 0.4; 
          }
        }

        /* Container */
        .hero-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1rem;
          position: relative;
          z-index: 10;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          min-height: 600px;
        }

        /* Content Section */
        .hero-content {
          animation: slideInLeft 1s ease-out;
        }

        @keyframes slideInLeft {
          from { 
            opacity: 0; 
            transform: translateX(-60px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
          border: 1px solid rgba(6, 182, 212, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0891b2;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
        }

        .badge-icon {
          font-size: 1rem;
        }

        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 2rem;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        .title-highlight {
          color: #1f2937;
          display: block;
        }

        .title-gradient {
          background: linear-gradient(135deg, #0891b2 0%, #3b82f6 50%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: block;
        }

        .hero-description {
          font-size: 1.25rem;
          line-height: 1.8;
          color: #6b7280;
          margin-bottom: 2.5rem;
          max-width: 500px;
        }

        /* Stats Section */
        .hero-stats {
          display: flex;
          gap: 2rem;
          margin-bottom: 3rem;
          padding: 1.5rem 0;
          border-top: 1px solid rgba(6, 182, 212, 0.1);
          border-bottom: 1px solid rgba(6, 182, 212, 0.1);
        }

        .stat-item {
          text-align: center;
          flex: 1;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 800;
          color: #0891b2;
          margin-bottom: 0.5rem;
          display: block;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        /* Buttons */
        .hero-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .btn-primary-link,
        .btn-secondary-link {
          text-decoration: none;
          display: block;
        }

        .btn-primary,
        .btn-secondary {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 2rem;
          font-size: 1.125rem;
          font-weight: 600;
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          border: none;
          cursor: pointer;
        }

        .btn-primary {
          background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%);
          color: white;
          box-shadow: 0 10px 30px rgba(8, 145, 178, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(8, 145, 178, 0.4);
          background: linear-gradient(135deg, #0e7490 0%, #0284c7 100%);
        }

        .btn-secondary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
        }

        .btn-secondary:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(99, 102, 241, 0.4);
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        }

        .btn-icon {
          font-size: 1.25rem;
          transition: transform 0.3s ease;
        }

        .btn-arrow {
          font-size: 1.25rem;
          transition: transform 0.3s ease;
          margin-left: auto;
        }

        .btn-primary:hover .btn-icon,
        .btn-secondary:hover .btn-icon {
          transform: scale(1.1);
        }

        .btn-primary:hover .btn-arrow,
        .btn-secondary:hover .btn-arrow {
          transform: translateX(4px);
        }

        /* Image Section */
        .hero-image-section {
          animation: slideInRight 1s ease-out 0.2s both;
        }

        @keyframes slideInRight {
          from { 
            opacity: 0; 
            transform: translateX(60px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }

        .image-container {
          position: relative;
          transform-style: preserve-3d;
        }

        .image-glow {
          position: absolute;
          inset: -20px;
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
          border-radius: 32px;
          filter: blur(30px);
          z-index: -1;
        }

        .hero-image {
          width: 100%;
          height: auto;
          border-radius: 24px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
          transition: transform 0.3s ease;
        }

        .hero-image:hover {
          transform: scale(1.02);
        }

        /* Floating Cards */
        .floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
          animation: floatCard 6s ease-in-out infinite;
          z-index: 10;
        }

        .card-support {
          bottom: -2rem;
          left: -2rem;
          animation-delay: 0s;
        }

        .card-success {
          top: 1rem;
          right: -1.5rem;
          animation-delay: 2s;
        }

        .card-team {
          top: 40%;
          left: -3rem;
          animation-delay: 4s;
        }

        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }

        .card-icon {
          width: 3rem;
          height: 3rem;
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.125rem;
          flex-shrink: 0;
        }

        .success-icon {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .team-icon {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          font-size: 1.25rem;
        }

        .card-content {
          flex: 1;
        }

        .card-title {
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
          font-size: 0.95rem;
        }

        .card-subtitle {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .card-pulse {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        /* Decorative Elements */
        .hero-decorative {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        .deco-cross {
          position: absolute;
          font-size: 2rem;
          color: rgba(6, 182, 212, 0.15);
          font-weight: 300;
          animation: rotate 20s linear infinite;
        }

        .deco-cross-1 {
          top: 15%;
          right: 15%;
          animation-delay: 0s;
        }

        .deco-cross-2 {
          bottom: 25%;
          left: 10%;
          animation-delay: 10s;
        }

        .deco-circle {
          position: absolute;
          border: 2px solid rgba(59, 130, 246, 0.1);
          border-radius: 50%;
          animation: float 15s ease-in-out infinite;
        }

        .deco-circle-1 {
          width: 100px;
          height: 100px;
          top: 20%;
          left: 20%;
          animation-delay: 0s;
        }

        .deco-circle-2 {
          width: 60px;
          height: 60px;
          bottom: 30%;
          right: 25%;
          animation-delay: 7s;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); opacity: 0.3; }
          50% { transform: translateY(-20px); opacity: 0.6; }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
            text-align: center;
          }

          .hero-title {
            font-size: 3rem;
          }

          .hero-stats {
            justify-content: center;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
          }

          .card-support {
            bottom: -1rem;
            left: 50%;
            transform: translateX(-50%);
          }

          .card-success,
          .card-team {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .hero-section {
            padding: 3rem 0 4rem 0;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .hero-stats {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .hero-buttons {
            width: 100%;
          }

          .btn-primary,
          .btn-secondary {
            justify-content: center;
          }

          .floating-card {
            position: relative;
            margin: 1rem 0;
          }

          .card-support {
            position: relative;
            bottom: auto;
            left: auto;
            transform: none;
            margin-top: 2rem;
          }
        }
      `}</style>
    </>
  )
}
