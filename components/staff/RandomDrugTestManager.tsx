"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarCard } from "@/components/ui/calendar";
import TimeSlotPicker from "@/components/ui/TimeSlotPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, TestTube2, Loader2 } from "lucide-react";
import type { StaffPatient } from "@/lib/patients";

type Props = {
  patients: StaffPatient[];
  onCreate?: (payload: { patientId: string; scheduledFor: string | null }) => Promise<void> | void;
};

export default function RandomDrugTestManager({ patients, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState<string>(patients[0]?.id ?? "");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slot, setSlot] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  function toIsoOrNull(): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (slot) {
      const [hh, mm] = slot.split(":").map(Number);
      d.setHours(hh || 0, mm || 0, 0, 0);
    }
    return d.toISOString();
  }

  async function createViaApi(payload: { patientId: string; scheduledFor: string | null }) {
    // Why: credentials:'include' ensures sb cookies flow to the API.
    const res = await fetch("/api/random-tests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error ?? "Request failed");
    }
  }

  function handleCreate() {
    const payload = { patientId, scheduledFor: toIsoOrNull() };
    startTransition(async () => {
      try {
        if (onCreate) await onCreate(payload);
        else await createViaApi(payload);
        setOpen(false);
      } catch (err: any) {
        alert(`Failed to create test\n${err?.message ?? String(err)}`);
      }
    });
  }

  const selectedPatient = patients.find(p => p.id === patientId);
  const hasValidSelection = patientId && (date || slot);

  return (
    <div className="flex justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="h-10 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
            <TestTube2 className="w-4 h-4 mr-2" />
            New Test
          </Button>
        </DialogTrigger>

        <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-8 pt-8 pb-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                <TestTube2 className="w-6 h-6" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-slate-800">New Random Test</DialogTitle>
            <DialogDescription className="text-center text-slate-600 text-base">
              Schedule a random drug test for a patient. Select the patient, date, and time below.
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 py-6 space-y-8">
            {/* Patient Selection */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Select Patient</h3>
                    <p className="text-sm text-slate-600">Choose the patient for this random test</p>
                  </div>
                </div>
                
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger className="h-12 bg-white border-2 border-slate-200 hover:border-cyan-300 focus:border-cyan-500 transition-colors">
                    <SelectValue placeholder="Select a patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {p.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-sm text-slate-500">{p.email}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPatient && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-cyan-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-medium">
                        {selectedPatient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{selectedPatient.name}</div>
                        <div className="text-sm text-slate-600">{selectedPatient.email}</div>
                      </div>
                      <Badge variant="secondary" className="ml-auto bg-cyan-100 text-cyan-700">
                        Selected
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Date and Time Selection */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Schedule Date & Time</h3>
                    <p className="text-sm text-slate-600">Choose when to conduct the test</p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
                  {/* Calendar */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Calendar className="w-4 h-4" />
                      Select Date
                    </div>
                    <CalendarCard value={date} onChange={setDate} />
                  </div>

                  {/* Time Picker */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock className="w-4 h-4" />
                      Select Time
                    </div>
                    <TimeSlotPicker 
                      date={date} 
                      value={slot} 
                      onChange={setSlot} 
                      intervalMinutes={30} 
                      startHour={8} 
                      endHour={20}
                      className="h-full"
                    />
                  </div>
                </div>

                {/* Selection Summary */}
                {(date || slot) && (
                  <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <Clock className="w-4 h-4" />
                      Scheduled For
                    </div>
                    <div className="flex items-center gap-4">
                      {date && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Badge>
                      )}
                      {slot && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {slot}
                        </Badge>
                      )}
                      {!date && !slot && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Unscheduled
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="px-8 py-6 bg-slate-50 border-t gap-3">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)} 
              disabled={isPending}
              className="h-11 px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isPending || !patientId}
              className="h-11 px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <TestTube2 className="w-4 h-4 mr-2" />
                  Create Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
