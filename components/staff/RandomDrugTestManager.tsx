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

        <DialogContent className="w-[95vw] sm:w-full sm:max-w-5xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-10 pt-10 pb-8 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-b border-slate-200">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg">
                <TestTube2 className="w-8 h-8" />
              </div>
            </div>
            <DialogTitle className="text-center text-3xl font-bold text-slate-800 mb-2">New Random Drug Test</DialogTitle>
            <DialogDescription className="text-center text-slate-600 text-lg max-w-2xl mx-auto">
              Schedule a random drug test for a patient. Select the patient, date, and time below to create the test.
            </DialogDescription>
          </DialogHeader>

          <div className="px-10 py-8 space-y-10 overflow-y-auto flex-1">
            {/* Patient Selection */}
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Select Patient</h3>
                    <p className="text-slate-600">Choose the patient for this random drug test</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger className="h-14 bg-white border-2 border-slate-300 hover:border-cyan-400 focus:border-cyan-500 transition-all duration-200 text-base shadow-sm">
                      <SelectValue placeholder="Select a patient..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-white border-2 border-slate-200 shadow-lg">
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="py-4 hover:bg-slate-50 focus:bg-slate-50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                              {p.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">{p.name}</div>
                              <div className="text-sm text-slate-600">{p.email}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedPatient && (
                    <div className="mt-6 p-6 bg-white rounded-xl border-2 border-cyan-200 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                          {selectedPatient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-slate-800">{selectedPatient.name}</div>
                          <div className="text-slate-600">{selectedPatient.email}</div>
                        </div>
                        <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 border-cyan-200 px-3 py-1 text-sm font-medium">
                          ✓ Selected
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Date and Time Selection */}
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Schedule Date & Time</h3>
                    <p className="text-slate-600">Choose when to conduct the random drug test</p>
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr,320px] xl:grid-cols-[1fr,360px]">
                  {/* Calendar */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-base font-semibold text-slate-700">
                      <Calendar className="w-5 h-5" />
                      Select Date
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <CalendarCard value={date} onChange={setDate} />
                    </div>
                  </div>

                  {/* Time Picker */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-base font-semibold text-slate-700">
                      <Clock className="w-5 h-5" />
                      Available Times
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm max-h-80 overflow-y-auto">
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
                </div>

                {/* Selection Summary */}
                {(date || slot) && (
                  <div className="mt-8 p-6 bg-white rounded-xl border-2 border-blue-200 shadow-sm">
                    <div className="flex items-center gap-3 text-base font-semibold text-slate-700 mb-4">
                      <Clock className="w-5 h-5" />
                      Scheduled For
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {date && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 px-4 py-2 text-sm font-medium">
                          📅 {date.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Badge>
                      )}
                      {slot && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 px-4 py-2 text-sm font-medium">
                          🕐 {slot}
                        </Badge>
                      )}
                      {!date && !slot && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 px-4 py-2 text-sm font-medium">
                          ⏰ Unscheduled
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="px-10 py-8 bg-white border-t border-slate-200 gap-4 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)} 
              disabled={isPending}
              className="h-12 px-8 text-base font-medium border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isPending || !patientId}
              className="h-12 px-10 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Creating Test...
                </>
              ) : (
                <>
                  <TestTube2 className="w-5 h-5 mr-3" />
                  Create Drug Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
