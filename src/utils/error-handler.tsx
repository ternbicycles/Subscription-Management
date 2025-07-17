import React from 'react';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/config/api';

export type ErrorHandler = (error: Error | ApiError) => void;

// Default error messages
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Authentication required. Please check your API key.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'Conflict with existing data.',
  422: 'Invalid data provided.',
  429: 'Too many requests. Please try again later.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable.',
  503: 'Service maintenance in progress.',
};

// Error handling utility
export const handleError = (error: Error | ApiError, customHandler?: ErrorHandler) => {
  console.error('Error occurred:', error);

  if (customHandler) {
    customHandler(error);
    return;
  }

  // Default handling
  if (error instanceof ApiError) {
    const message = error.message || DEFAULT_ERROR_MESSAGES[error.status || 500] || 'An unexpected error occurred';
    
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  } else {
    toast({
      title: 'Error',
      description: error.message || 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
};

// Async error wrapper
export const withErrorHandling = async <T,>(
  asyncFn: () => Promise<T>,
  customHandler?: ErrorHandler
): Promise<T | null> => {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error as Error, customHandler);
    return null;
  }
};

// React error boundary fallback
export const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold text-destructive">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
};

// Validation error helper
export const getValidationErrors = (error: ApiError): Record<string, string> => {
  if (error.data?.errors && typeof error.data.errors === 'object') {
    return error.data.errors;
  }
  return {};
};

// Network error check
export const isNetworkError = (error: Error): boolean => {
  return error instanceof TypeError && error.message === 'Failed to fetch';
};

// Retry logic
export const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || !isNetworkError(error as Error)) {
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};