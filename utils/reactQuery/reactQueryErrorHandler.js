/**
 * Global error handler for React Query errors
 * This can be used to implement consistent error handling across the application
 */

import { toast } from '@/components/ui/sonner';
import { ApiError } from './api';

/**
 * Default error handler for React Query
 * @param {Error} error - Error object from the query or mutation
 * @param {Object} queryInfo - Additional information about the query
 */
export const defaultErrorHandler = (error, queryInfo = {}) => {
  console.error('React Query Error:', error, queryInfo);
  
  // If it's our own ApiError, handle it specifically
  if (error instanceof ApiError) {
    handleApiError(error);
    return;
  }
  
  // For network errors
  if (error.message === 'Network Error' || error.name === 'AbortError') {
    toast.error('Network error. Please check your internet connection.');
    return;
  }
  
  // Generic error
  toast.error('An error occurred. Please try again later.');
};

/**
 * Handle specific API errors based on status code and message
 * @param {ApiError} error - API error object
 */
export const handleApiError = (error) => {
  // Authentication errors
  if (error.status === 401) {
    toast.error('Authentication required. Please log in again.');
    // Optional: Redirect to login page
    // router.push('/login');
    return;
  }
  
  // Authorization errors
  if (error.status === 403) {
    toast.error('You do not have permission to perform this action.');
    return;
  }
  
  // Validation errors
  if (error.status === 400) {
    const message = error.data?.message || error.message || 'Invalid request';
    toast.error(`Validation error: ${message}`);
    return;
  }
  
  // Not found errors
  if (error.status === 404) {
    toast.error('The requested resource was not found.');
    return;
  }
  
  // Rate limiting
  if (error.status === 429) {
    toast.error('Too many requests. Please try again later.');
    return;
  }
  
  // Server errors
  if (error.status >= 500) {
    toast.error('Server error. Our team has been notified.');
    return;
  }
  
  // Default error message
  toast.error(error.message || 'An error occurred');
};

/**
 * Create a custom error handler with additional context
 * @param {string} context - Error context for logging
 * @returns {Function} Error handler function
 */
export const createErrorHandler = (context) => {
  return (error, queryInfo) => {
    console.error(`React Query Error [${context}]:`, error, queryInfo);
    defaultErrorHandler(error, { ...queryInfo, context });
  };
};

/**
 * Query client default error handlers
 * Can be used when creating a query client
 */
export const queryErrorHandler = (error) => {
  defaultErrorHandler(error, { type: 'query' });
};

export const mutationErrorHandler = (error) => {
  defaultErrorHandler(error, { type: 'mutation' });
};

export default {
  defaultErrorHandler,
  handleApiError,
  createErrorHandler,
  queryErrorHandler,
  mutationErrorHandler
}; 