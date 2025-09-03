'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mic, Send, FileText, BookOpen, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MeetingCopilotProps {
  meetingId: string;
}

export default function MeetingCopilot({ meetingId }: MeetingCopilotProps) {
  const [activeTab, setActiveTab] = useState('transcribe');
  const [concept, setConcept] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();


  const { data: summaryData, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['meeting-summary', meetingId],
    queryFn: async () => {
      const response = await fetch(`/api/meeting/${meetingId}/copilot/summary`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('获取会议摘要失败');
      }

      return response.json();
    },
    enabled: false,
  });

  const { data: chaptersData, isLoading: isChaptersLoading, refetch: refetchChapters } = useQuery({
    queryKey: ['meeting-chapters', meetingId],
    queryFn: async () => {
      const response = await fetch(`/api/meeting/${meetingId}/copilot/auto-chapters`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('获取章节时间戳失败');
      }

      return response.json();
    },
    enabled: false, // 不自动获取，需要手动触发
  });

  // 概念解释
  const conceptMutation = useMutation({
    mutationFn: async (concept: string) => {
      const response = await fetch(`/api/meeting/${meetingId}/copilot/concept-explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ concept }),
      });

      if (!response.ok) {
        throw new Error('获取概念解释失败');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '概念解释已生成',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '获取概念解释失败',
        description: error.message,
      });
    },
  });

  // 语音转文字
  const transcribeMutation = useMutation({
    mutationFn: async (audioData: any) => {
      const response = await fetch(`/api/meeting/${meetingId}/copilot/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioData }),
      });

      if (!response.ok) {
        throw new Error('语音转文字失败');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '语音已转换为文字',
      });
      setIsRecording(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '语音转文字失败',
        description: error.message,
      });
      setIsRecording(false);
    },
  });

  // 模拟开始录音
  const handleStartRecording = () => {
    setIsRecording(true);
    toast({
      title: '开始录音',
      description: '请对着麦克风说话...',
    });

    // 模拟5秒后停止录音并发送请求
    setTimeout(() => {
      // 模拟音频数据
      const mockAudioData = { audio: 'base64_encoded_audio_data' };
      transcribeMutation.mutate(mockAudioData);
    }, 5000);
  };

  // 处理概念解释提交
  const handleConceptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (concept.trim()) {
      conceptMutation.mutate(concept.trim());
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="transcribe">
            <Mic className="h-4 w-4 mr-2" />
            转录
          </TabsTrigger>
          <TabsTrigger value="summary">
            <FileText className="h-4 w-4 mr-2" />
            摘要
          </TabsTrigger>
          <TabsTrigger value="concept">
            <BookOpen className="h-4 w-4 mr-2" />
            概念
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcribe" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>实时语音转文字</CardTitle>
              <CardDescription>
                将您的语音转换为文字，并自动发送到聊天区
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleStartRecording}
                disabled={isRecording || transcribeMutation.isPending}
                className="w-full"
              >
                {isRecording || transcribeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isRecording ? '录音中...' : '处理中...'}
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    开始录音
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>会议摘要</CardTitle>
              <CardDescription>
                自动生成会议内容的摘要和关键点
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => refetchSummary()}
                disabled={isSummaryLoading}
                className="w-full"
              >
                {isSummaryLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>生成会议摘要</>
                )}
              </Button>

              {summaryData && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">会议摘要</h4>
                  <div className="whitespace-pre-wrap text-sm">
                    {summaryData.summary}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  章节时间戳
                </h4>
                <Button
                  variant="outline"
                  onClick={() => refetchChapters()}
                  disabled={isChaptersLoading}
                  size="sm"
                  className="w-full"
                >
                  {isChaptersLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>生成章节时间戳</>
                  )}
                </Button>

                {chaptersData && chaptersData.chapters && (
                  <div className="mt-4 space-y-2">
                    {chaptersData.chapters.map((chapter: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between text-sm p-2 bg-background rounded-md"
                      >
                        <span>{chapter.title}</span>
                        <span className="text-muted-foreground">
                          {formatTime(chapter.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concept" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>概念解释</CardTitle>
              <CardDescription>
                输入一个概念，获取详细解释、示例和可视化
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConceptSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="输入概念名称..."
                    className="flex-1"
                    disabled={conceptMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!concept.trim() || conceptMutation.isPending}
                  >
                    {conceptMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {conceptMutation.data && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">定义</h4>
                      <p className="text-sm">
                        {conceptMutation.data.explanation.definition}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">示例</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {conceptMutation.data.explanation.examples.map(
                          (example: string, index: number) => (
                            <li key={index}>{example}</li>
                          )
                        )}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">思维导图</h4>
                      <div className="bg-muted p-4 rounded-md text-center text-sm">
                        思维导图可视化（此处将显示基于概念的思维导图）
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}