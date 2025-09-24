'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Shield, 
  User, 
  Brain, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle
} from 'lucide-react';
import { useTextClassifier, ClassificationResponse } from '@/hooks/ai/use-text-classifier';

interface SubmissionAICheckerProps {
  submissionText: string;
  submissionId?: number;
  className?: string;
  onDetectionResult?: (result: ClassificationResponse & { submissionId?: number }) => void;
}

export function SubmissionAIChecker({ 
  submissionText, 
  submissionId,
  className,
  onDetectionResult 
}: SubmissionAICheckerProps) {
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  
  const { classifyText, loading, result, error } = useTextClassifier({
    onSuccess: (result) => {
      setHasAnalyzed(true);
      console.log('🎯 AI Checker received result:', result);
      onDetectionResult?.({ ...result, submissionId });
    }
  });

  const handleAnalyze = () => {
    classifyText(submissionText);
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
        return <Shield className="h-4 w-4" />;
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

  const getRiskLevel = (classification: string, confidence: number, analysis: any) => {
    // Prioritize using API returned risk_level
    const apiRiskLevel = analysis?.risk_level;
    if (apiRiskLevel) {
      const riskMap = {
        'low': { level: 'Low', color: 'text-green-600' },
        'medium': { level: 'Medium', color: 'text-yellow-600' },
        'high': { level: 'High', color: 'text-red-600' }
      };
      return riskMap[apiRiskLevel as keyof typeof riskMap] || { level: 'Medium', color: 'text-yellow-600' };
    }

    // If has AI traces, elevate risk level
    if (analysis?.has_ai_traces) {
      return { level: 'Medium+', color: 'text-orange-600' };
    }

    // Traditional logic
    if (classification.toLowerCase() === 'human') {
      return { level: 'Low', color: 'text-green-600' };
    }
    if (classification.toLowerCase() === 'ai_generated') {
      return { 
        level: confidence > 0.8 ? 'High' : confidence > 0.6 ? 'Medium' : 'Low',
        color: confidence > 0.8 ? 'text-red-600' : confidence > 0.6 ? 'text-yellow-600' : 'text-green-600'
      };
    }
    return { level: 'Medium', color: 'text-yellow-600' };
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          AI Content Detection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnalyzed && !result && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Analyze this submission to detect potential AI-generated content
            </p>
            <Button 
              onClick={handleAnalyze}
              disabled={loading || !submissionText || submissionText.length < 10}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="h-3 w-3 mr-2" />
                  Check Content
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            {/* Main Result */}
            <div className="flex items-center justify-between">
              <Badge 
                variant="outline" 
                className={`${getClassificationColor(result.classification)}`}
              >
                {getClassificationIcon(result.classification)}
                <span className="ml-1 capitalize">{result.classification.replace('-', ' ')}</span>
              </Badge>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {(result.confidence * 100).toFixed(1)}% confidence
                </div>
                <div className="text-xs text-muted-foreground">
                  Risk: <span className={getRiskLevel(result.classification, result.confidence, result.analysis).color}>
                    {getRiskLevel(result.classification, result.confidence, result.analysis).level}
                  </span>
                </div>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="space-y-1">
              <Progress value={result.confidence * 100} className="h-2" />
            </div>


            {/* Quick Summary */}
            {result.classification.toLowerCase() === 'ai-generated' && result.confidence > 0.7 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>High likelihood of AI generation.</strong> This submission may require manual review.
                </AlertDescription>
              </Alert>
            )}

            {result.classification.toLowerCase() === 'human-written' && result.confidence > 0.8 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Appears to be human-written.</strong> Low risk of AI generation detected.
                </AlertDescription>
              </Alert>
            )}

            {/* Detailed Probabilities */}
            {Object.keys(result.probabilities).length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View detailed analysis
                </summary>
                <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted">
                  {Object.entries(result.probabilities).map(([type, probability]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="capitalize">{type.replace('-', ' ')}</span>
                      <span className="font-medium">{(probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-muted-foreground">
                    Analysis completed in {result.processing_time.toFixed(0)}ms
                  </div>
                </div>
              </details>
            )}

            {/* Re-analyze Button */}
            <Button 
              onClick={handleAnalyze}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
