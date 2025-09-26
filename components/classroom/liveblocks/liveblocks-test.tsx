'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface LiveblocksTestProps {
  classroomSlug: string;
}

export function LiveblocksTest({ classroomSlug }: LiveblocksTestProps) {
  const [testMessage, setTestMessage] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [envStatus, setEnvStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  useEffect(() => {
    // 检查环境变量
    const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
    if (!publicKey) {
      setEnvStatus('error');
      setTestResults(prev => [...prev, '❌ 缺少环境变量 NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY']);
    } else if (!publicKey.startsWith('pk_')) {
      setEnvStatus('error');
      setTestResults(prev => [...prev, '❌ Public Key 格式错误，应该以 pk_ 开头']);
    } else {
      setEnvStatus('ok');
      setTestResults(prev => [...prev, '✅ 环境变量配置正确']);
    }
  }, []);

  const testAuthEndpoint = async () => {
    setTestResults(prev => [...prev, '🔍 测试认证端点...']);
    
    try {
      const response = await fetch('/api/liveblocks-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          room: `classroom:${classroomSlug}:test:${Date.now()}`
        }),
      });

      if (response.ok) {
        setTestResults(prev => [...prev, '✅ 认证端点工作正常']);
        const data = await response.json();
        if (data.token) {
          setTestResults(prev => [...prev, '✅ 获得认证Token']);
        }
      } else {
        const errorData = await response.json();
        setTestResults(prev => [...prev, `❌ 认证失败 (${response.status}): ${errorData.error}`]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, `❌ 认证请求失败: ${error instanceof Error ? error.message : String(error)}`]);
    }
  };

  const testLiveblocksConnection = async () => {
    setTestResults(prev => [...prev, '🔗 测试Liveblocks连接...']);
    
    if (!process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY) {
      setTestResults(prev => [...prev, '❌ 无法测试连接：缺少Public Key']);
      return;
    }

    try {
      // 动态导入Liveblocks以避免服务端错误
      const { createClient } = await import('@liveblocks/client');
      
      const client = createClient({
        publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
        authEndpoint: "/api/liveblocks-auth",
      });

      setTestResults(prev => [...prev, '✅ Liveblocks客户端创建成功']);

      // 尝试进入测试房间
      const roomId = `classroom:${classroomSlug}:test:${Date.now()}`;
      const room = client.enterRoom(roomId, {
        initialPresence: {
          cursor: null,
          userName: 'Test User',
          userAvatar: '',
          userRole: 'student' as const,
          isDrawing: false,
        },
      });

      setTestResults(prev => [...prev, '🏠 正在连接测试房间...']);

      // 监听连接状态
      room.subscribe('connection', (status) => {
        if (status === 'open') {
          setTestResults(prev => [...prev, '✅ 房间连接成功']);
          setTimeout(() => room.leave(), 1000); // 1秒后离开房间
        } else if (status === 'closed') {
          setTestResults(prev => [...prev, '📤 已离开测试房间']);
        }
      });

      room.subscribe('error', (error) => {
        setTestResults(prev => [...prev, `❌ 房间连接错误: ${error.message}`]);
      });

    } catch (error) {
      setTestResults(prev => [...prev, `❌ Liveblocks连接失败: ${error instanceof Error ? error.message : String(error)}`]);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    await testAuthEndpoint();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    await testLiveblocksConnection();
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Liveblocks 快速测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 环境状态 */}
          <div className="flex items-center gap-2">
            <span className="font-medium">环境状态:</span>
            <Badge variant={envStatus === 'ok' ? 'default' : 'destructive'}>
              {envStatus === 'ok' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  正常
                </>
              ) : envStatus === 'error' ? (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  错误
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  检查中
                </>
              )}
            </Badge>
          </div>

          {/* 测试按钮 */}
          <div className="flex gap-2">
            <Button onClick={runAllTests} className="flex-1">
              运行所有测试
            </Button>
            <Button onClick={testAuthEndpoint} variant="outline">
              测试认证
            </Button>
            <Button onClick={testLiveblocksConnection} variant="outline">
              测试连接
            </Button>
            <Button onClick={clearResults} variant="outline">
              清空结果
            </Button>
          </div>

          {/* 手动测试 */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">手动测试消息发送:</h4>
            <div className="flex gap-2">
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="输入测试消息..."
              />
              <Button 
                onClick={() => {
                  if (testMessage.trim()) {
                    setTestResults(prev => [...prev, `📝 测试消息: ${testMessage}`]);
                    setTestMessage('');
                  }
                }}
                disabled={!testMessage.trim()}
              >
                发送
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>测试结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className="p-2 bg-gray-50 rounded text-sm font-mono"
                >
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 配置提示 */}
      {envStatus === 'error' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>配置问题:</strong> 请确保在 .env.local 文件中设置了正确的 Liveblocks 环境变量:
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
LIVEBLOCKS_SECRET_KEY=sk_prod_...
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_prod_...
            </pre>
          </AlertDescription>
        </Alert>
      )}

      {/* 调试信息 */}
      <Card>
        <CardHeader>
          <CardTitle>调试信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>教室:</strong> {classroomSlug}</div>
          <div><strong>Public Key:</strong> {
            process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ? 
            process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY.substring(0, 10) + '...' : 
            '未配置'
          }</div>
          <div><strong>认证端点:</strong> /api/liveblocks-auth</div>
          <div><strong>测试房间格式:</strong> classroom:{classroomSlug}:test:timestamp</div>
        </CardContent>
      </Card>
    </div>
  );
}
