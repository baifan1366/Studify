'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TextClassifier } from '@/components/ai/text-classifier';
import { SubmissionAIChecker } from '@/components/ai/submission-ai-checker';
import { 
  Brain, 
  FileText, 
  Shield, 
  TrendingUp,
  Users,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

// Sample texts for demonstration
const sampleTexts = {
  human: `The impact of climate change on marine ecosystems is becoming increasingly evident through various environmental indicators. Rising ocean temperatures have led to coral bleaching events across major reef systems, particularly in the Great Barrier Reef and Caribbean regions. Additionally, ocean acidification caused by increased CO2 absorption is affecting shell-forming organisms like mollusks and crustaceans. These changes create cascading effects throughout the food chain, ultimately impacting commercial fisheries and coastal communities that depend on marine resources for their livelihood.`,
  
  ai: `Artificial intelligence has revolutionized numerous industries by providing efficient solutions to complex problems. Machine learning algorithms can process vast amounts of data to identify patterns and make predictions with remarkable accuracy. These systems continuously improve their performance through iterative learning processes, making them invaluable tools for businesses seeking to optimize operations and enhance decision-making capabilities. Furthermore, AI applications span across healthcare, finance, transportation, and education sectors, demonstrating their versatility and potential for widespread adoption.`,
  
  paraphrased: `The effects of global warming on ocean life are becoming more apparent through different environmental signs. Higher sea temperatures have caused coral whitening incidents in major reef areas, especially in Australia's Great Barrier Reef and the Caribbean Sea. Moreover, the increase in ocean acidity due to more CO2 being absorbed is harming creatures that make shells, such as shellfish and lobsters. These modifications trigger chain reactions across the entire food web, eventually affecting commercial fishing and seaside towns that rely on ocean resources for income.`
};

export default function AIDetectionPage() {
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [detectionResults, setDetectionResults] = useState<any[]>([]);

  const handleSampleSelect = (type: keyof typeof sampleTexts) => {
    setSelectedSample(sampleTexts[type]);
  };

  const handleDetectionResult = (result: any) => {
    setDetectionResults(prev => [result, ...prev.slice(0, 4)]);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">AI Content Detection</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Analyze text to identify AI-generated content, paraphrased text, and human-written content
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detectionResults.length}</div>
            <p className="text-xs text-muted-foreground">This session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Human Written</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {detectionResults.filter(r => r.classification === 'human-written').length}
            </div>
            <p className="text-xs text-muted-foreground">Detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
            <Brain className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {detectionResults.filter(r => r.classification === 'ai-generated').length}
            </div>
            <p className="text-xs text-muted-foreground">Detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paraphrased</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {detectionResults.filter(r => r.classification === 'paraphrased').length}
            </div>
            <p className="text-xs text-muted-foreground">Detected</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="classifier" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classifier" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Full Classifier
          </TabsTrigger>
          <TabsTrigger value="submission" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Submission Checker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classifier" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TextClassifier onClassificationResult={handleDetectionResult} />
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sample Texts</CardTitle>
                  <CardDescription>Try these examples to see how the classifier works</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => handleSampleSelect('human')}
                    className="w-full p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Human Written</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Academic text about climate change impacts
                    </p>
                  </button>

                  <button
                    onClick={() => handleSampleSelect('ai')}
                    className="w-full p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-4 w-4 text-red-600" />
                      <span className="font-medium">AI Generated</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Technical text about artificial intelligence
                    </p>
                  </button>

                  <button
                    onClick={() => handleSampleSelect('paraphrased')}
                    className="w-full p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">Paraphrased</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Rewritten version of the human text
                    </p>
                  </button>
                </CardContent>
              </Card>

              {/* Recent Results */}
              {detectionResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {detectionResults.slice(0, 3).map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <Badge variant="outline" className="text-xs">
                          {result.classification}
                        </Badge>
                        <span className="text-xs font-medium">
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="submission" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Submission AI Checker Demo</CardTitle>
                <CardDescription>
                  This component can be integrated into assignment submission reviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubmissionAIChecker 
                  submissionText={selectedSample || "Select a sample text from the right panel to test the submission checker."}
                  submissionId={1}
                  onDetectionResult={handleDetectionResult}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">For Assignment Reviews:</h4>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {`<SubmissionAIChecker 
  submissionText={submission.content}
  submissionId={submission.id}
  onDetectionResult={handleResult}
/>`}
                  </code>
                </div>

                <div>
                  <h4 className="font-medium mb-2">For Full Analysis:</h4>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {`<TextClassifier 
  onClassificationResult={handleResult}
/>`}
                  </code>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Permission Requirements:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Requires tutor or admin role</li>
                    <li>Text must be 10-10,000 characters</li>
                    <li>Results include confidence scores</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
