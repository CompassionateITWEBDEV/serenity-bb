'use client';

import { useEffect } from 'react';
import { initErrorHandler } from '@/lib/error-handler-client';

export default function ClientErrorHandler() {
  useEffect(() => {
    // Initialize client-side error handling
    initErrorHandler();
  }, []);

  // This component doesn't render anything
  return null;
}
