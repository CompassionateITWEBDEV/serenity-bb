import { PatientIntakeForm } from "@/components/patient-intake-form"

export default function IntakePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">Patient Intake Form</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Take the first step towards recovery. This confidential form helps us understand your needs and provide the
            best possible care.
          </p>
        </div>
        <PatientIntakeForm />
      </div>
    </div>
  )
}
