'use client';

/**
 * Client-side error handler for unhandled errors and promise rejections
 */

interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
}

class ClientErrorHandler {
  private isInitialized = false;

  init() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.isInitialized = true;

    try {
      // Handle unhandled errors
      window.addEventListener('error', (event) => {
        this.handleError({
          message: event.message,
          stack: event.error?.stack,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        });
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError({
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        });
      });

      console.log('✅ Client error handler initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize error handler:', error);
    }
  }

  private handleError(errorInfo: ErrorInfo) {
    // Prevent infinite loops by checking if this is an error from our own handler
    if (errorInfo.message?.includes('Client error caught') || 
        errorInfo.message?.includes('error-handler-client')) {
      return;
    }

    console.error('🚨 Client error caught:', errorInfo);

    // In development, show detailed error info
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Details');
      console.error('Message:', errorInfo.message);
      console.error('Stack:', errorInfo.stack);
      console.error('URL:', errorInfo.url);
      console.error('User Agent:', errorInfo.userAgent);
      console.error('Timestamp:', new Date(errorInfo.timestamp).toISOString());
      console.groupEnd();
    }

    // In production, you can send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(errorInfo);
    }
  }

  private reportError(errorInfo: ErrorInfo) {
    // Send to error reporting service (Sentry, LogRocket, etc.)
    // For now, just log to console
    console.error('Production error report:', errorInfo);
    
    // Example: Send to your API endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorInfo),
    // }).catch(console.error);
  }
}

// Create singleton instance
export const clientErrorHandler = new ClientErrorHandler();

// Export for manual initialization (preferred approach)
export function initErrorHandler() {
  clientErrorHandler.init();
}
