"use client";

import { useState } from 'react';
import { clearAllAuthData, checkAndFixAuthIssues } from '@/lib/clear-auth';
import { supabase } from '@/lib/supabase-browser';

interface AuthDebugPanelProps {
  show?: boolean;
}

export default function AuthDebugPanel({ show = false }: AuthDebugPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('');

  const handleCheckAuth = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setAuthStatus(`Error: ${error.message}`);
      } else if (data.session) {
        setAuthStatus(`Authenticated: ${data.session.user.email}`);
      } else {
        setAuthStatus('Not authenticated');
      }
    } catch (err: any) {
      setAuthStatus(`Exception: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuth = async () => {
    setIsLoading(true);
    try {
      await clearAllAuthData();
      setAuthStatus('Auth data cleared, redirecting...');
    } catch (err: any) {
      setAuthStatus(`Error clearing auth: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleFixAuth = async () => {
    setIsLoading(true);
    try {
      const fixed = await checkAndFixAuthIssues();
      setAuthStatus(fixed ? 'Auth issues fixed, redirecting...' : 'No auth issues found');
    } catch (err: any) {
      setAuthStatus(`Error fixing auth: ${err.message}`);
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="font-semibold text-sm mb-2">Auth Debug Panel</h3>
      
      <div className="space-y-2">
        <button
          onClick={handleCheckAuth}
          disabled={isLoading}
          className="w-full px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
        >
          {isLoading ? 'Checking...' : 'Check Auth Status'}
        </button>
        
        <button
          onClick={handleFixAuth}
          disabled={isLoading}
          className="w-full px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
        >
          {isLoading ? 'Fixing...' : 'Fix Auth Issues'}
        </button>
        
        <button
          onClick={handleClearAuth}
          disabled={isLoading}
          className="w-full px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
        >
          {isLoading ? 'Clearing...' : 'Clear All Auth Data'}
        </button>
      </div>
      
      {authStatus && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
          {authStatus}
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        <p>Use this panel if you're experiencing auth errors.</p>
        <p>Try "Fix Auth Issues" first, then "Clear All Auth Data" if needed.</p>
      </div>
    </div>
  );
}
