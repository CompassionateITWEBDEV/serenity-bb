'use client';

import { useEffect, useState } from 'react';

export default function EnvironmentCheck() {
  const [envStatus, setEnvStatus] = useState<{
    supabaseUrl: boolean;
    supabaseAnon: boolean;
    allGood: boolean;
  }>({
    supabaseUrl: false,
    supabaseAnon: false,
    allGood: false,
  });

  useEffect(() => {
    const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    setEnvStatus({
      supabaseUrl,
      supabaseAnon,
      allGood: supabaseUrl && supabaseAnon,
    });

    if (!supabaseUrl || !supabaseAnon) {
      console.warn('⚠️ Missing Supabase environment variables:', {
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
      });
    }
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg text-xs z-50">
      <div className="font-bold mb-1">Environment Status:</div>
      <div className={`${envStatus.supabaseUrl ? 'text-green-400' : 'text-red-400'}`}>
        Supabase URL: {envStatus.supabaseUrl ? '✅' : '❌'}
      </div>
      <div className={`${envStatus.supabaseAnon ? 'text-green-400' : 'text-red-400'}`}>
        Supabase Anon: {envStatus.supabaseAnon ? '✅' : '❌'}
      </div>
      {!envStatus.allGood && (
        <div className="text-yellow-400 mt-1">
          ⚠️ Add .env.local with Supabase credentials
        </div>
      )}
    </div>
  );
}












