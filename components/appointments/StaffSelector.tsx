"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface StaffMember {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  active: boolean;
}

interface StaffSelectorProps {
  value?: string | null;
  onValueChange: (staffId: string) => void;
  placeholder?: string;
}

export default function StaffSelector({
  value,
  onValueChange,
  placeholder = "Select a healthcare provider",
}: StaffSelectorProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStaff() {
      try {
        const { data, error } = await supabase
          .from("staff")
          .select("user_id, first_name, last_name, email, active")
          .eq("active", true)
          .order("first_name", { ascending: true });

        if (error) {
          console.error("Error loading staff:", error);
          setStaff([]);
        } else {
          setStaff((data as StaffMember[]) || []);
        }
      } catch (error) {
        console.error("Error loading staff:", error);
        setStaff([]);
      } finally {
        setLoading(false);
      }
    }

    loadStaff();
  }, []);

  const getStaffName = (member: StaffMember) => {
    const name = [member.first_name, member.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || member.email?.split("@")[0] || "Staff Member";
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading providers...</span>
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {staff.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-gray-500">
            No healthcare providers available
          </div>
        ) : (
          staff.map((member) => (
            <SelectItem key={member.user_id} value={member.user_id}>
              {getStaffName(member)}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

