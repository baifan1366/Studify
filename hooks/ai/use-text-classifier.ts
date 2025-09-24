import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ClassificationRequest {
  text: string;
  attachment_url?: string;
  attachment_type?: string;
}

export interface ClassificationResponse {
  classification: string;
  confidence: number;
  probabilities: Record<string, number>;
  analysis: Record<string, any>;
  suggestions: string[];
  processing_time: number;
  text_hash: string;
}

export interface UseTextClassifierOptions {
  apiEndpoint?: string;
  onSuccess?: (result: ClassificationResponse) => void;
  onError?: (error: string) => void;
}

export function useTextClassifier(options: UseTextClassifierOptions = {}) {
  const {
    apiEndpoint = '/api/ai/detect-classify',
    onSuccess,
    onError
  } = options;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateText = useCallback((text: string): string | null => {
    if (!text || text.trim().length === 0) {
      return 'Text is required';
    }
    if (text.length < 10) {
      return 'Text must be at least 10 characters long';
    }
    if (text.length > 10000) {
      return 'Text must not exceed 10,000 characters';
    }
    return null;
  }, []);

  const classifyText = useCallback(async (text: string) => {
    const validationError = validateText(text);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 🔍 Frontend Debug: Request information
      console.log('🌐 Frontend API Request:', {
        endpoint: apiEndpoint,
        textLength: text.length,
        textPreview: text.slice(0, 100),
        timestamp: new Date().toISOString()
      });

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      // 🔍 Frontend Debug: Response status
      console.log('🌐 Frontend API Response Status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        // Try to read error response body
        let errorDetails = 'Unknown error';
        try {
          const errorBody = await response.text();
          console.log('❌ Error Response Body:', errorBody);
          errorDetails = errorBody;
        } catch (e) {
          console.log('❌ Could not read error response body');
        }

        if (response.status === 422) {
          try {
            const errorData = JSON.parse(errorDetails);
            const errorMessage = errorData.detail?.[0]?.msg || 'Validation error';
            throw new Error(errorMessage);
          } catch (e) {
            throw new Error(`Validation error: ${errorDetails}`);
          }
        }
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorDetails}`);
      }

      const data: ClassificationResponse = await response.json();
      
      // 🔍 Frontend Debug: Successful response data
      console.log('✅ Frontend Received Data:', {
        classification: data.classification,
        confidence: data.confidence,
        probabilities: data.probabilities,
        analysis: data.analysis,
        suggestionsCount: data.suggestions?.length || 0,
        processingTime: data.processing_time,
        fullData: data
      });
      
      setResult(data);
      onSuccess?.(data);
      
      toast({
        title: "Analysis Complete",
        description: `Text classified as ${data.classification} with ${(data.confidence * 100).toFixed(1)}% confidence`,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to classify text';
      setError(errorMessage);
      onError?.(errorMessage);
      
      toast({
        title: "Classification Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, validateText, onSuccess, onError, toast]);

  const classifyAttachment = useCallback(async (attachmentUrl: string, attachmentType: string, fallbackText?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestBody: ClassificationRequest = {
        text: fallbackText || '', // Fallback text if attachment extraction fails
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 422) {
          const errorData = await response.json();
          const errorMessage = errorData.detail?.[0]?.msg || 'Validation error';
          throw new Error(errorMessage);
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data: ClassificationResponse = await response.json();
      setResult(data);
      onSuccess?.(data);
      
      toast({
        title: "Attachment Analysis Complete",
        description: `Content classified as ${data.classification} with ${(data.confidence * 100).toFixed(1)}% confidence`,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to classify attachment';
      setError(errorMessage);
      onError?.(errorMessage);
      
      toast({
        title: "Attachment Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, onSuccess, onError, toast]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    classifyText,
    classifyAttachment,
    loading,
    result,
    error,
    reset,
    validateText
  };
}
