"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type Props = {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
};

export default function DatePicker({ value, onChange, placeholder = "Pick a date", disabled, className }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal h-10", !value && "text-gray-500", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "EEE, dd MMM yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2">
        <Calendar
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false); // close after pick
          }}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
