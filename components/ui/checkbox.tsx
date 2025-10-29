"use client"

import * as React from "react"
import { Check } from "lucide-react"

interface CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked = false, onChange, onCheckedChange, disabled = false, className = "", id, ...props }, ref) => {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => {
            const isChecked = e.target.checked;
            onChange?.(isChecked);
            onCheckedChange?.(isChecked);
          }}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`
            h-4 w-4 rounded-sm border-2 transition-all duration-200 cursor-pointer
            ${checked 
              ? 'bg-emerald-600 border-emerald-600 text-white' 
              : 'bg-white border-slate-300 hover:border-slate-400'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:shadow-sm'
            }
          `}
          onClick={() => {
            if (!disabled) {
              const newChecked = !checked;
              onChange?.(newChecked);
              onCheckedChange?.(newChecked);
            }
          }}
        >
          {checked && (
            <div className="flex items-center justify-center h-full">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }
