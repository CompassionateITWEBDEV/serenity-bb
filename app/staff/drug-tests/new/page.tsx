// app/staff/drug-tests/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  TestTube2,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Plus,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

type DrugTestType = {
  id: string;
  name: string;
  description: string;
  substances: string[];
  collectionMethod: string;
  detectionWindow: string;
};

type Patient = {
  id: string;
  name: string;
  room: string;
  status: string;
};

const DRUG_TEST_TYPES: DrugTestType[] = [
  {
    id: "urine",
    name: "Urine Drug Test",
    description: "Standard 10-panel urine test",
    substances: ["THC", "Cocaine", "Amphetamines", "Opiates", "PCP", "Benzodiazepines", "Barbiturates", "Methadone", "MDMA", "Oxycodone"],
    collectionMethod: "Urine Collection",
    detectionWindow: "1-30 days"
  },
  {
    id: "saliva",
    name: "Saliva Drug Test",
    description: "Oral fluid drug screening",
    substances: ["THC", "Cocaine", "Amphetamines", "Opiates", "Benzodiazepines"],
    collectionMethod: "Oral Swab",
    detectionWindow: "1-3 days"
  },
  {
    id: "hair",
    name: "Hair Follicle Test",
    description: "Comprehensive hair analysis",
    substances: ["THC", "Cocaine", "Amphetamines", "Opiates", "PCP", "Benzodiazepines", "Barbiturates", "Methadone"],
    collectionMethod: "Hair Sample",
    detectionWindow: "90 days"
  },
  {
    id: "blood",
    name: "Blood Drug Test",
    description: "Blood sample analysis",
    substances: ["THC", "Cocaine", "Amphetamines", "Opiates", "Benzodiazepines", "Alcohol"],
    collectionMethod: "Blood Draw",
    detectionWindow: "1-2 days"
  }
];

const MOCK_PATIENTS: Patient[] = [
  { id: "1", name: "John Smith", room: "Room 101", status: "Active" },
  { id: "2", name: "Sarah Johnson", room: "Room 102", status: "Active" },
  { id: "3", name: "Michael Brown", room: "Room 103", status: "Active" },
  { id: "4", name: "Emily Davis", room: "Room 104", status: "Active" },
  { id: "5", name: "David Wilson", room: "Room 105", status: "Active" },
  { id: "6", name: "Lisa Anderson", room: "Room 106", status: "Active" },
];

export default function NewDrugTestPage() {
  const router = useRouter();
  const [selectedTestType, setSelectedTestType] = useState<string>("");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isRandom, setIsRandom] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedTest = DRUG_TEST_TYPES.find(test => test.id === selectedTestType);

  const handlePatientToggle = (patientId: string) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === MOCK_PATIENTS.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(MOCK_PATIENTS.map(p => p.id));
    }
  };

  const handleSubmit = async () => {
    if (!selectedTestType) {
      toast.error("Please select a test type");
      return;
    }

    if (selectedPatients.length === 0) {
      toast.error("Please select at least one patient");
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select date and time");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`Drug test scheduled for ${selectedPatients.length} patient(s)`);
      router.push("/staff/dashboard?tab=tests");
    } catch (error) {
      toast.error("Failed to create drug test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPatientsData = MOCK_PATIENTS.filter(p => selectedPatients.includes(p.id));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/staff/dashboard?tab=tests")}
              className="text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">New Drug Test</h1>
              <p className="text-sm text-slate-500">Schedule a new drug test for patients</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <TestTube2 className="h-3 w-3 mr-1" />
              Drug Testing
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Test Type Selection */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-emerald-600" />
              Test Type Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DRUG_TEST_TYPES.map((test) => (
                <div
                  key={test.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTestType === test.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => setSelectedTestType(test.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      selectedTestType === test.id ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                    }`}>
                      <TestTube2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{test.name}</h3>
                      <p className="text-sm text-slate-500">{test.description}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600">
                    <div><strong>Method:</strong> {test.collectionMethod}</div>
                    <div><strong>Detection:</strong> {test.detectionWindow}</div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTest && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  <strong>Selected:</strong> {selectedTest.name} - Tests for {selectedTest.substances.join(", ")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Patient Selection */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Patient Selection
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedPatients.length === MOCK_PATIENTS.length ? "Deselect All" : "Select All"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MOCK_PATIENTS.map((patient) => (
                <div
                  key={patient.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedPatients.includes(patient.id)
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => handlePatientToggle(patient.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedPatients.includes(patient.id)}
                      onChange={() => handlePatientToggle(patient.id)}
                    />
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-100 to-blue-200 flex items-center justify-center text-cyan-700 font-semibold text-sm">
                      {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{patient.name}</div>
                      <div className="text-sm text-slate-500">{patient.room} • {patient.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedPatients.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="text-sm font-medium text-slate-700 mb-2">
                  Selected Patients ({selectedPatients.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPatientsData.map((patient) => (
                    <Badge key={patient.id} variant="secondary" className="text-xs">
                      {patient.name} ({patient.room})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Scheduled Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="time">Scheduled Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="random"
                checked={isRandom}
                onCheckedChange={(checked) => setIsRandom(checked as boolean)}
              />
              <Label htmlFor="random" className="text-sm">
                Random test (will be scheduled within the next 24 hours)
              </Label>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions or notes for this test..."
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {selectedTestType && selectedPatients.length > 0 && (
          <Card className="shadow-sm border-emerald-200 bg-emerald-50">
            <CardHeader>
              <CardTitle className="text-emerald-800">Test Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Test Type:</strong> {selectedTest?.name}</div>
              <div><strong>Patients:</strong> {selectedPatients.length} selected</div>
              <div><strong>Date:</strong> {scheduledDate || "Not selected"}</div>
              <div><strong>Time:</strong> {scheduledTime || "Not selected"}</div>
              <div><strong>Type:</strong> {isRandom ? "Random Test" : "Scheduled Test"}</div>
              {notes && <div><strong>Notes:</strong> {notes}</div>}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/staff/dashboard?tab=tests")}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedTestType || selectedPatients.length === 0 || !scheduledDate || !scheduledTime || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Test...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Drug Test
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

