"use client";

import Image from "next/image";
import { useState } from "react";

export function JointCommissionLogo() {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return null; // Don't render anything if image fails to load
  }

  return (
    <a 
      href="https://www.jointcommission.org" 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex-shrink-0"
      aria-label="Joint Commission Accreditation"
    >
      <Image
        src="/joint commission logo.png"
        alt="Joint Commission Accredited"
        width={160}
        height={160}
        className="object-contain opacity-80 hover:opacity-100 transition-opacity"
        onError={() => setImageError(true)}
      />
    </a>
  );
}

