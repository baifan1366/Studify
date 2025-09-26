'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface SimpleTestProps {
  classroomSlug: string;
}

export function SimpleTest({ classroomSlug }: SimpleTestProps) {
  const [results, setResults] = useState<{ step: string; status: 'success' | 'error' | 'pending'; message: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (step: string, status: 'success' | 'error' | 'pending', message: string) => {
    setResults(prev => [...prev, { step, status, message }]);
  };

  const updateLastResult = (status: 'success' | 'error', message: string) => {
    setResults(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last) {
        last.status = status;
        last.message = message;
      }
      return updated;
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: 环境变量检查
      addResult('环境变量', 'pending', '检查环境变量...');
      const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
      
      if (!publicKey) {
        updateLastResult('error', '❌ 未找到 NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY');
      } else if (!publicKey.startsWith('pk_')) {
        updateLastResult('error', '❌ Public Key 格式错误');
      } else {
        updateLastResult('success', '✅ 环境变量配置正确');
      }

      // Test 2: 认证API测试
      addResult('认证API', 'pending', '测试认证端点...');
      try {
        const response = await fetch('/api/liveblocks-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ room: `classroom:${classroomSlug}:test` })
        });

        if (response.ok) {
          updateLastResult('success', '✅ 认证API工作正常');
        } else {
          const errorData = await response.json();
          updateLastResult('error', `❌ 认证失败: ${errorData.error}`);
        }
      } catch (error) {
        updateLastResult('error', `❌ 认证请求失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test 3: Liveblocks包检查
      addResult('Liveblocks包', 'pending', '检查Liveblocks包...');
      try {
        const { createClient } = await import('@liveblocks/client');
        updateLastResult('success', '✅ Liveblocks包加载成功');
      } catch (error) {
        updateLastResult('error', `❌ Liveblocks包加载失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test 4: 用户状态检查
      addResult('用户状态', 'pending', '检查用户登录状态...');
      try {
        const authResponse = await fetch('/api/auth/me', { credentials: 'include' });
        if (authResponse.ok) {
          const userData = await authResponse.json();
          updateLastResult('success', `✅ 用户已登录: ${userData.display_name || userData.email}`);
        } else {
          updateLastResult('error', '❌ 用户未登录');
        }
      } catch (error) {
        updateLastResult('error', `❌ 用户状态检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      addResult('系统错误', 'error', `❌ 测试过程中发生错误: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setIsRunning(false);
  };

  const getIcon = (status: 'success' | 'error' | 'pending') => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>🔧 Liveblocks 基础检查</CardTitle>
            <Button onClick={runTests} disabled={isRunning}>
              {isRunning ? '测试中...' : '开始测试'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>教室:</strong> {classroomSlug}</div>
            <div><strong>测试房间:</strong> classroom:{classroomSlug}:test</div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>测试结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded">
                  {getIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-medium">{result.step}</div>
                    <div className="text-sm text-gray-600">{result.message}</div>
                  </div>
                  <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>调试步骤:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>确保环境变量正确配置</li>
            <li>确保用户已登录</li>
            <li>确保用户是教室成员</li>
            <li>检查网络连接</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>环境配置检查</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>Public Key:</strong> {
              process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ? 
              `${process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY.substring(0, 10)}...` : 
              '❌ 未配置'
            }
          </div>
          <div>
            <strong>API端点:</strong> /api/liveblocks-auth
          </div>
          <div>
            <strong>测试页面:</strong>
            <ul className="list-disc list-inside mt-1">
              <li>/en/classroom/{classroomSlug}/liveblocks-test</li>
              <li>/en/classroom/{classroomSlug}/liveblocks-debug</li>
              <li>/en/classroom/{classroomSlug}/collaborate</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
