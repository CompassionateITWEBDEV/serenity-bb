"use client";

import React, { Component, ReactNode } from 'react';
import { supabase } from '@/lib/supabase-browser';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is an auth-related error
    const errorMessage = error.message || error.toString();
    const isAuthError = /invalid\s+refresh\s+token|refresh\s+token\s+not\s+found|not\s+found|auth/i.test(errorMessage);
    
    if (isAuthError) {
      return { hasError: true, error };
    }
    
    // Let other errors bubble up
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorMessage = error.message || error.toString();
    const isAuthError = /invalid\s+refresh\s+token|refresh\s+token\s+not\s+found|not\s+found|auth/i.test(errorMessage);
    
    if (isAuthError) {
      console.warn('⚠️ Auth error caught by error boundary:', error);
      
      // Clear auth data and redirect
      this.handleAuthError();
    } else {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  private async handleAuthError() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('⚠️ Error during signOut in boundary:', e);
    }
    
    try {
      localStorage.removeItem('sb-app-auth');
      sessionStorage.clear();
    } catch (e) {
      console.warn('⚠️ Error clearing storage in boundary:', e);
    }
    
    // Redirect to login
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
