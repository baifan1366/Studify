'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  User, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  FileText,
  Zap,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClassificationResponse {
  classification: string;
  confidence: number;
  probabilities: Record<string, number>;
  analysis: Record<string, any>;
  suggestions: string[];
  processing_time: number;
  text_hash: string;
}

interface TextClassifierProps {
  apiEndpoint?: string;
  className?: string;
  onClassificationResult?: (result: ClassificationResponse) => void;
}

export function TextClassifier({ 
  apiEndpoint = '/api/ai/detect-classify',
  className,
  onClassificationResult 
}: TextClassifierProps) {
  const t = useTranslations('TextClassifier');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateText = (text: string): string | null => {
    if (text.length < 10) {
      return 'Text must be at least 10 characters long';
    }
    if (text.length > 10000) {
      return 'Text must not exceed 10,000 characters';
    }
    return null;
  };

  const classifyText = async () => {
    const validationError = validateText(text);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        if (response.status === 422) {
          const errorData = await response.json();
          throw new Error(errorData.detail?.[0]?.msg || 'Validation error');
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data: ClassificationResponse = await response.json();
      setResult(data);
      onClassificationResult?.(data);
      
      toast({
        title: "Analysis Complete",
        description: `Text classified as ${data.classification} with ${(data.confidence * 100).toFixed(1)}% confidence`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to classify text';
      setError(errorMessage);
      toast({
        title: "Classification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'human-written':
        return <User className="h-4 w-4" />;
      case 'ai-generated':
        return <Brain className="h-4 w-4" />;
      case 'paraphrased':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'human-written':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'ai-generated':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'paraphrased':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Content Detector
          </CardTitle>
          <CardDescription>
            Analyze text to determine if it's human-written, AI-generated, or paraphrased content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Text to Analyze</label>
              <span className="text-xs text-muted-foreground">
                {text.length}/10,000 characters
              </span>
            </div>
            <Textarea
              placeholder="Paste the text you want to analyze here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-32 resize-none"
              disabled={loading}
            />
            {text.length > 0 && (
              <Progress 
                value={(text.length / 10000) * 100} 
                className="h-1"
              />
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={classifyText}
            disabled={loading || text.length < 10 || text.length > 10000}
            className="w-full"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Classify Text
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Classification Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Classification */}
            <div className="text-center space-y-3">
              <Badge 
                variant="outline" 
                className={`text-lg px-4 py-2 ${getClassificationColor(result.classification)}`}
              >
                {getClassificationIcon(result.classification)}
                <span className="ml-2 capitalize">{result.classification}</span>
              </Badge>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <span className={`font-semibold ${getConfidenceColor(result.confidence)}`}>
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={result.confidence * 100} 
                  className="w-48 mx-auto"
                />
              </div>
            </div>

            <Separator />

            {/* Detailed Probabilities */}
            {Object.keys(result.probabilities).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Detailed Probabilities
                </h4>
                <div className="grid gap-3">
                  {Object.entries(result.probabilities).map(([type, probability]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getClassificationIcon(type)}
                        <span className="text-sm capitalize">{type.replace('-', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 max-w-32">
                        <Progress value={probability * 100} className="flex-1" />
                        <span className="text-xs font-medium w-12 text-right">
                          {(probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Details */}
            {Object.keys(result.analysis).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Analysis Details</h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  {Object.entries(result.analysis).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="capitalize text-muted-foreground">
                        {key.replace('_', ' ')}:
                      </span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Suggestions</h4>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meta Information */}
            <div className="pt-3 border-t text-xs text-muted-foreground flex justify-between">
              <span>Processing time: {result.processing_time.toFixed(2)}ms</span>
              <span>Hash: {result.text_hash.substring(0, 8)}...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
