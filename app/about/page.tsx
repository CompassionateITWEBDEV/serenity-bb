import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Users, Heart, Shield, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Serenity Rehabilitation Center, Inc. — About page (summarized, visual, animated).
 * WHY: Improves scan-ability and conversion while preserving your full narrative.
 * NOTE: If framer-motion isn't installed: `npm i framer-motion`
 */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

function HeroSummary() {
  return (
    <section aria-labelledby="about-hero" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-600 via-cyan-600 to-sky-500" />
      <div className="absolute inset-0 -z-10 opacity-10 [background-image:radial-gradient(60rem_60rem_at_80%_-10%,white_10%,transparent_60%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={stagger}
            className="text-white space-y-6"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
              <Sparkles className="h-4 w-4" />
              <span>Serenity Rehabilitation Center, Inc.</span>
            </motion.div>

            <motion.h1 id="about-hero" variants={fadeUp} className="text-4xl sm:text-5xl font-serif font-bold leading-tight">
              Hope, science, and care — delivered with dignity
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/90 text-lg leading-relaxed">
              We provide research-based care for substance use disorders and mental health challenges. A multidisciplinary team blends medical treatment, counseling, and family involvement so you can heal safely and sustainably.
            </motion.p>

            <motion.div variants={fadeUp} className="space-y-3 text-white/90">
              <p className="font-semibold">TL;DR</p>
              <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                <li className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">Medication-assisted & intensive mental health care</li>
                <li className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">Personalized plans with family engagement</li>
                <li className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">Compassionate, evidence-based, 24/7 support</li>
                <li className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">Community education & prevention resources</li>
              </ul>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-gray-100">
                <Link href="/intake" className="inline-flex items-center gap-2">
                  Start Intake <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                <Link href="/contact" className="inline-flex items-center gap-2">
                  Get Information <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          <ImageMosaic />
        </div>
      </div>
    </section>
  );
}

function ImageMosaic() {
  // WHY: Plain <img> avoids Next/Image domain config; swap to <Image> if configured.
  const images = [
    { src: "/caring-nurse-helping-patient-in-medical-setting.jpg", alt: "Nurse supporting patient", shift: "" },
    { src: "/therapy-group.jpg", alt: "Small group therapy", shift: "translate-y-6" },
    { src: "/family-support.jpg", alt: "Family support session", shift: "-translate-y-6" },
    { src: "/nutrition-counseling.jpg", alt: "Nutrition counseling", shift: "" },
  ];
  return (
    <div className="relative grid grid-cols-2 gap-4">
      {images.map((img, i) => (
        <motion.img
          key={img.src}
          src={img.src}
          alt={img.alt}
          className={`rounded-2xl shadow-2xl ring-1 ring-white/30 ${img.shift}`}
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1 * i }}
          whileHover={{ scale: 1.015 }}
        />
      ))}
    </div>
  );
}

function StatsStrip() {
  const stats = [
    { k: "10+", v: "Successful Recoveries" },
    { k: "2+", v: "Years of Experience" },
    { k: "24/7", v: "Support Available" },
    { k: "98%", v: "Patient Satisfaction" },
  ];
  return (
    <section aria-labelledby="stats" className="bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="stats" className="sr-only">Key outcomes</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.v} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-2xl font-bold text-cyan-600 mb-1">{s.k}</p>
                <p className="text-gray-700">{s.v}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function GoalCard() {
  return (
    <section aria-labelledby="our-goal" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 id="our-goal" className="text-3xl font-serif font-bold text-gray-900">Our Goal</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <Card className="bg-white rounded-2xl shadow-sm border-l-4 border-l-cyan-600">
            <CardContent className="p-6">
              <div className="inline-block rounded-md bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-800 mb-4">
                WHAT WE DO
              </div>
              <div className="space-y-4 text-gray-700 leading-relaxed" style={{ textAlign: "justify" }}>
                <p>Deliver high-level therapeutic interventions—fast—for children, adolescents, and adults in severe distress.</p>
                <p>Provide up to 6 hours/day of coordinated care with clinicians and families, guided by person-centered treatment plans.</p>
                <p>Offer intensive care in the least restrictive setting while teaching proactive coping skills for long-term growth.</p>
              </div>
              <div className="mt-6">
                <Button asChild variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Link href="/programs">Explore programs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 text-[1.05rem] text-gray-700 leading-[1.9] max-w-3xl" style={{ textAlign: "justify" }}>
            <h3 className="text-2xl font-serif font-bold text-gray-900">About Us (Summary)</h3>
            <p>Serenity Rehabilitation Center blends medication-assisted treatment, intensive mental health services, and supportive counseling—personalized to each person’s needs and delivered with compassion and dignity.</p>
            <p>Family involvement and community education are core, helping reduce stigma, prevent relapse, and improve whole-person wellness.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ValuesGrid() {
  const items = [
    { icon: Heart, label: "Compassion", desc: "Care with empathy" },
    { icon: Shield, label: "Safety", desc: "Secure environment" },
    { icon: Users, label: "Community", desc: "Peer support" },
    { icon: Award, label: "Excellence", desc: "High standards" },
  ];
  return (
    <section aria-labelledby="values" className="bg-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="values" className="text-2xl font-serif font-bold text-gray-900 mb-6">Our Values</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="rounded-xl bg-indigo-50 p-3">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{label}</p>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExpandableDetails() {
  return (
    <section className="pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* WHY: Keeps page scannable while preserving full narrative for those who want details. */}
        <details className="group rounded-xl border border-gray-200 bg-white p-6 open:shadow-sm">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Read full About Us details</h3>
              <span className="ml-4 text-sm text-indigo-600 group-open:rotate-90 transition-transform">▶</span>
            </div>
          </summary>
          <div className="mt-4 space-y-4 text-[1.05rem] text-gray-700 leading-[1.9] max-w-6xl" style={{ textAlign: "justify" }}>
            <p>
              At Serenity Rehabilitation Center, Inc., our mission is to provide excellent, research-based care for individuals facing substance use disorders (SUD) and mental health challenges. We understand that SUD is a disease that can be fatal if untreated, and we are dedicated to guiding individuals and families toward recovery with compassion, dignity, and respect.
            </p>
            <p>
              Our programs include medication-assisted treatment, intensive mental health services, and supportive counseling tailored to the unique needs of each person. By combining therapeutic interventions with family involvement, we create an environment that fosters healing and growth.
            </p>
            <p>
              We also serve as a resource to the community, working to educate the public on addiction and advocating for the value of treatment in improving overall wellness.
            </p>
            <p>
              We deliver comprehensive care and counseling to patients in need — ensuring that every step of the journey is supported with expertise, compassion, and a commitment to helping individuals reach their full potential.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-indigo-600 rounded-2xl p-8 md:p-10 text-center text-white">
          <h2 className="text-3xl font-serif font-bold mb-3">Join Our Community of Recovery</h2>
          <p className="text-lg md:text-xl mb-6 opacity-90">
            Take the first step toward healing and transformation today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild className="bg-white text-indigo-700 hover:bg-gray-100">
              <Link href="/intake">Start Your Journey</Link>
            </Button>
            <Button size="lg" asChild variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
              <Link href="/contact">Get Information</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSummary />
        <StatsStrip />
        <GoalCard />
        <ValuesGrid />
        <ExpandableDetails />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
