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
  // IN NETWORK
  "HAP",
  "UHC",
  "AETNA BETTER HEALTH",
  "BCBS",
  "BCBSM",
  "BCN",
  "MCLAREN",
  "AMERIHEALTH CARITAS",
  "CIGNA",
  "MERIDIAN COMPLETE",
  "WELLCARE",
  "PRIORITY HEALTH PLAN",
  "MOLINA",
  "OPTUM VA CCN",
  "AMBETTER",
  "ZING",
  "ZING HEALTH PLAN",
  "NGS",
  "MEDICAID",
  // OUT OF NETWORK
  "HUMANA",
  "AETNA",
  "HAP CARESOURCE",
  "BCC - IN PROCESS",
  "ALIGN SENIOR PLUS",
  // Additional variants for compatibility
  "AETNA BETTER HEALTH-MEDICARE",
  "AMERIHEALTH CARITAS VIP CARE PLUS",
  "ASR",
  "BCBS MEDICARE ADVANTAGE",
  "BCBS MI",
  "BCN ADVANTAGE XYK",
  "BLUE CARE NETWORK",
  "BLUE CROSS COMPLETE",
  "CIGNA- PPO",
  "COVENTRY",
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
  "PRIORITY HEALTH MEDICARE",
  "TOTAL HEALTHCARE, INC",
  "UNITED HEALTH CARE MEDICARE",
  "VA",
  "WELLCARE MEDICARE",
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
                <Input id="emergencyContactName" type="text" placeholder="Emergency contact full name" value={formData.emergencyContactName} onChange={(e) => handleInputChange("emergencyContactName", e.target.value)} />
              </div>

              <div>
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input id="emergencyContactPhone" type="tel" placeholder="(555) 123-4567" value={formData.emergencyContactPhone} onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)} />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="primaryConcern">Primary Concern *</Label>
                <Textarea id="primaryConcern" placeholder="Please describe your primary concern or reason for seeking treatment" className="min-h-20" value={formData.primaryConcern} onChange={(e) => handleInputChange("primaryConcern", e.target.value)} required />
              </div>

              <div>
                <Label>Have you received addiction treatment before?</Label>
                <div className="flex space-x-6 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="previousTreatment" value="yes" checked={formData.previousTreatment === "yes"} onChange={(e) => handleInputChange("previousTreatment", e.target.value)} className="text-cyan-500" />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="previousTreatment" value="no" checked={formData.previousTreatment === "no"} onChange={(e) => handleInputChange("previousTreatment", e.target.value)} className="text-cyan-500" />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="currentMedications">Current Medications</Label>
                <Textarea id="currentMedications" placeholder="List any medications you are currently taking" value={formData.currentMedications} onChange={(e) => handleInputChange("currentMedications", e.target.value)} />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="treatmentType">Preferred Treatment Type</Label>
                <Select value={formData.treatmentType} onValueChange={(value) => handleInputChange("treatmentType", value)}>
                  <SelectTrigger><SelectValue placeholder="Select treatment type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inpatient">Inpatient Treatment</SelectItem>
                    <SelectItem value="outpatient">Outpatient Treatment</SelectItem>
                    <SelectItem value="intensive-outpatient">Intensive Outpatient</SelectItem>
                    <SelectItem value="detox">Detoxification</SelectItem>
                    <SelectItem value="counseling">Individual Counseling</SelectItem>
                    <SelectItem value="group">Group Therapy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Do you have health insurance?</Label>
                <div className="flex space-x-6 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="hasInsurance" value="yes" checked={formData.hasInsurance === "yes"} onChange={(e) => handleInputChange("hasInsurance", e.target.value)} className="text-cyan-500" />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="hasInsurance" value="no" checked={formData.hasInsurance === "no"} onChange={(e) => handleInputChange("hasInsurance", e.target.value)} className="text-cyan-500" />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Accepted Insurance Providers</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-cyan-700 mb-1">In Network:</p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      HAP, UHC, AETNA BETTER HEALTH, BCBS, BCBSM, BCN, MCLAREN, AMERIHEALTH CARITAS, CIGNA, MERIDIAN COMPLETE, WELLCARE, PRIORITY HEALTH PLAN, MOLINA, OPTUM VA CCN, AMBETTER, ZING, ZING HEALTH PLAN, NGS, MEDICAID
                    </p>
                  </div>
                  <div className="pt-2 border-t border-cyan-200">
                    <p className="text-xs font-medium text-cyan-700 mb-1">Out of Network:</p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      HUMANA, AETNA, HAP CARESOURCE, BCC - IN PROCESS, ALIGN SENIOR PLUS
                    </p>
                  </div>
                </div>
              </div>

              {formData.hasInsurance === "yes" && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="insuranceProvider">Insurance Provider *</Label>
                    <Select
                      value={formData.insuranceProvider}
                      onValueChange={(value) => handleInputChange("insuranceProvider", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your insurance" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COVERED_INSURERS.map((label) => (
                          <SelectItem key={label} value={label}>{label}</SelectItem>
                        ))}
                        <SelectItem value="Not sure">Not sure</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.insuranceProvider === "Other" && (
                    <div>
                      <Label htmlFor="insuranceProviderOther">Enter Insurance Provider *</Label>
                      <Input
                        id="insuranceProviderOther"
                        placeholder="Type your insurance provider"
                        onChange={(e) => handleInputChange("insuranceProvider", e.target.value)}
                      />
                      {/* why: we reuse insuranceProvider to keep payload simple */}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea id="additionalNotes" placeholder="Any additional information you'd like us to know" value={formData.additionalNotes} onChange={(e) => handleInputChange("additionalNotes", e.target.value)} />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Review Your Information</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Name:</strong> {formData.fullName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                  <p><strong>Contact Method:</strong> {formData.preferredContactMethod}</p>
                  <p><strong>Treatment Type:</strong> {formData.treatmentType || "—"}</p>
                  <p><strong>Insurance:</strong> {formData.hasInsurance === "no" ? "No" : (formData.insuranceProvider || "—")}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start space-x-3">
                  <input type="checkbox" required className="mt-1 text-cyan-500" />
                  <span className="text-sm">I consent to treatment and understand that this information will be used to provide appropriate care *</span>
                </label>
                <label className="flex items-start space-x-3">
                  <input type="checkbox" required className="mt-1 text-cyan-500" />
                  <span className="text-sm">I agree to the privacy policy and terms of service *</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={prevStep} className="px-6 bg-transparent">
                Previous
              </Button>
            )}

            <div className="ml-auto">
              {currentStep < totalSteps ? (
                <Button type="button" onClick={nextStep} className="bg-cyan-500 hover:bg-cyan-600 text-white px-6">
                  Next Step
                </Button>
              ) : (
                <Button disabled={submitting} type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white px-8">
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
