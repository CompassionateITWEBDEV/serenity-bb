// components/patient-intake-form.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getSwal } from "@/lib/sweetalert";

interface PatientIntakeFormData {
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredContactMethod: string;
  primaryConcern: string;
  previousTreatment: string;
  currentMedications: string;
  treatmentType: string;
  hasInsurance: string;          // "yes" | "no"
  insuranceProvider: string;     // label from list or "Other"/"Not sure"
  additionalNotes: string;
}

/* Covered payers (verbatim list + common variants) */
const COVERED_INSURERS: string[] = [
  "AETNA BETTER HEALTH-MEDICARE",
  "AETNA",
  "AMBETTER HEALTH PLAN",
  "AMERIHEALTH CARITAS VIP CARE PLUS",
  "ASR",
  "BCBS MEDICARE ADVANTAGE",
  "BCBS MI",
  "BCN ADVANTAGE XYK",
  "BLUE CARE NETWORK",
  "BLUE CROSS COMPLETE",
  "CIGNA- PPO",
  "COVENTRY",
  "HAP CARESOURCE",
  "HAP MEDICARE PLUS BLUE",
  "HAP SENIOR PLUS MEDICARE",
  "HEALTHPLUS OF MICHIGAN",
  "HUMANA MEDICARE",
  "MCLAREN MEDICARE",
  "MEDICARE A",
  "MEDICARE B",
  "MEDICARE PLUS BLUE",
  "MERIDIAN COMPLETE MICHIGAN",
  "MMCD MERIDIAN HMP",
  "MICHIGAN COMPLETE",
  "MOLINA MEDICARE",
  "NGS",
  "PRIORITY HEALTH MEDICARE",
  "TOTAL HEALTHCARE, INC",
  "UNITED HEALTH CARE MEDICARE",
  "VA",
  "WELLCARE MEDICARE",
  "ZING HEALTH PLAN",
];

export function PatientIntakeForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<PatientIntakeFormData>({
    fullName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    preferredContactMethod: "phone",
    primaryConcern: "",
    previousTreatment: "no",
    currentMedications: "",
    treatmentType: "",
    hasInsurance: "no",
    insuranceProvider: "",
    additionalNotes: "",
  });

  const totalSteps = 4;

  const handleInputChange = (field: keyof PatientIntakeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // validation: require insurer when "Yes"
    if (formData.hasInsurance === "yes" && !formData.insuranceProvider) {
      getSwal()?.fire({
        icon: "warning",
        title: "Select your insurance",
        text: "Please choose your insurance provider from the list.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Submission failed");
      }

      const Swal = getSwal();
      await Swal?.fire({
        icon: "success",
        title: "Application submitted",
        text: "Thank you. Our team will contact you within 24 hours.",
        confirmButtonText: "Done",
        confirmButtonColor: "#06b6d4",
      });

      setFormData({
        fullName: "",
        dateOfBirth: "",
        email: "",
        phone: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        preferredContactMethod: "phone",
        primaryConcern: "",
        previousTreatment: "no",
        currentMedications: "",
        treatmentType: "",
        hasInsurance: "no",
        insuranceProvider: "",
        additionalNotes: "",
      });
      setCurrentStep(1);
    } catch (err) {
      const Swal = getSwal();
      await Swal?.fire({
        icon: "error",
        title: "Could not submit",
        text: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Personal Information";
      case 2: return "Medical History";
      case 3: return "Treatment Preferences";
      case 4: return "Review & Submit";
      default: return "Patient Intake";
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-serif text-center text-gray-900">Start Your Recovery Journey</CardTitle>
        <div className="flex justify-center items-center space-x-2 mt-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className={`w-3 h-3 rounded-full ${step === currentStep ? "bg-cyan-500" : step < currentStep ? "bg-cyan-300" : "bg-gray-200"}`} />
          ))}
        </div>
        <p className="text-center text-gray-600 mt-2">Confidential assessment & immediate support</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{getStepTitle()}</h3>

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" type="text" placeholder="Enter your full name" value={formData.fullName} onChange={(e) => handleInputChange("fullName", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => handleInputChange("dateOfBirth", e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" placeholder="your@email.com" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" type="tel" placeholder="(555) 123-4567" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} required />
                </div>
              </div>

              <div>
                <Label>Preferred Contact Method</Label>
                <div className="flex space-x-6 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="preferredContactMethod" value="phone" checked={formData.preferredContactMethod === "phone"} onChange={(e) => handleInputChange("preferredContactMethod", e.target.value)} className="text-cyan-500" />
                    <span>Phone</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="preferredContactMethod" value="email" checked={formData.preferredContactMethod === "email"} onChange={(e) => handleInputChange("preferredContactMethod", e.target.value)} className="text-cyan-500" />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
