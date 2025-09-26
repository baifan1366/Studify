'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@liveblocks/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  Key,
  Database,
  Users,
  RefreshCw
} from 'lucide-react';

interface DebugResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: any;
}

interface LiveblocksDebugProps {
  classroomSlug: string;
  sessionId?: string;
}

export function LiveblocksDebug({ classroomSlug, sessionId }: LiveblocksDebugProps) {
  const [debugResults, setDebugResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const initialTests: DebugResult[] = [
    { name: '环境变量检查', status: 'pending', message: '检查Liveblocks环境变量...' },
    { name: '客户端初始化', status: 'pending', message: '初始化Liveblocks客户端...' },
    { name: '认证服务', status: 'pending', message: '测试认证API...' },
    { name: '房间连接', status: 'pending', message: '测试房间连接...' },
    { name: '存储功能', status: 'pending', message: '测试实时存储...' },
    { name: '用户权限', status: 'pending', message: '验证用户权限...' },
  ];

  const updateResult = (index: number, status: DebugResult['status'], message: string, details?: any) => {
    setDebugResults(prev => prev.map((result, i) => 
      i === index ? { ...result, status, message, details } : result
    ));
  };

  const runDebugTests = async () => {
    setIsRunning(true);
    setDebugResults(initialTests);

    try {
      // Test 1: 环境变量检查
      updateResult(0, 'pending', '检查环境变量...');
      const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
      
      if (!publicKey) {
        updateResult(0, 'error', '缺少 NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY 环境变量', {
          required: 'NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY',
          found: 'undefined',
          solution: '请在 .env.local 中设置 Liveblocks Public Key'
        });
        return;
      } else if (!publicKey.startsWith('pk_')) {
        updateResult(0, 'error', 'Public Key 格式不正确', {
          expected: 'pk_...',
          found: publicKey.substring(0, 10) + '...',
          solution: '确保使用正确的 Liveblocks Public Key'
        });
        return;
      } else {
        updateResult(0, 'success', '环境变量配置正确', {
          publicKey: publicKey.substring(0, 10) + '...',
          keyLength: publicKey.length
        });
      }

      // Test 2: 客户端初始化
      updateResult(1, 'pending', '初始化客户端...');
      let client;
      try {
        client = createClient({
          publicApiKey: publicKey,
          throttle: 16,
          authEndpoint: "/api/liveblocks-auth",
        });
        updateResult(1, 'success', 'Liveblocks客户端初始化成功', {
          throttle: '16ms',
          authEndpoint: '/api/liveblocks-auth'
        });
      } catch (error) {
        updateResult(1, 'error', '客户端初始化失败', {
          error: error instanceof Error ? error.message : String(error)
        });
        return;
      }

      // Test 3: 认证服务测试
      updateResult(2, 'pending', '测试认证API...');
      try {
        const roomId = `classroom:${classroomSlug}:whiteboard${sessionId ? `:${sessionId}` : ''}`;
        const authResponse = await fetch('/api/liveblocks-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ room: roomId }),
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          updateResult(2, 'success', '认证API工作正常', {
            status: authResponse.status,
            roomId,
            hasToken: !!authData.token
          });
        } else {
          const errorData = await authResponse.json();
          updateResult(2, 'error', `认证失败: ${authResponse.status}`, {
            status: authResponse.status,
            error: errorData.error,
            details: errorData.details
          });
        }
      } catch (error) {
        updateResult(2, 'error', '认证API请求失败', {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Test 4: 房间连接测试
      updateResult(3, 'pending', '测试房间连接...');
      try {
        const roomId = `classroom:${classroomSlug}:debug:${Date.now()}`;
        
        const room = client.enterRoom(roomId, {
          initialPresence: {
            cursor: null,
            userName: 'Debug User',
            userAvatar: '',
            userRole: 'student' as const,
            isDrawing: false,
          },
        });

        setConnectionStatus('connecting');
        
        const connectionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('连接超时'));
          }, 10000); // 10秒超时

          room.subscribe('connection', (status) => {
            clearTimeout(timeout);
            setConnectionStatus(status);
            if (status === 'open') {
              resolve(status);
            } else if (status === 'closed') {
              reject(new Error('连接被关闭'));
            }
          });

          room.subscribe('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        await connectionPromise;
        updateResult(3, 'success', '房间连接成功', {
          roomId,
          connectionStatus: 'open'
        });

        // Test 5: 存储功能测试
        updateResult(4, 'pending', '测试存储功能...');
        try {
          const storage = room.getStorage();
          await storage.root.set('testKey', 'testValue');
          const value = await storage.root.get('testKey');
          
          if (value === 'testValue') {
            updateResult(4, 'success', '存储功能正常', {
              testWrite: true,
              testRead: true,
              value
            });
          } else {
            updateResult(4, 'warning', '存储读写不匹配', {
              expected: 'testValue',
              actual: value
            });
          }
        } catch (error) {
          updateResult(4, 'error', '存储功能测试失败', {
            error: error instanceof Error ? error.message : String(error)
          });
        }

        // Test 6: 用户权限测试
        updateResult(5, 'pending', '检查用户权限...');
        try {
          const others = room.getOthers();
          const self = room.getSelf();
          
          updateResult(5, 'success', '权限检查完成', {
            selfId: self?.id,
            selfInfo: self?.info,
            othersCount: others.length
          });
        } catch (error) {
          updateResult(5, 'error', '权限检查失败', {
            error: error instanceof Error ? error.message : String(error)
          });
        }

        // 清理连接
        room.leave();
        setConnectionStatus('disconnected');

      } catch (error) {
        updateResult(3, 'error', '房间连接失败', {
          error: error instanceof Error ? error.message : String(error)
        });
        setConnectionStatus('disconnected');
      }

    } catch (error) {
      console.error('Debug test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DebugResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'pending': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: DebugResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
    }
  };

  useEffect(() => {
    runDebugTests();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 状态总览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🔍 Liveblocks 系统诊断
              <Badge variant="outline" className="flex items-center gap-1">
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    已连接
                  </>
                ) : connectionStatus === 'connecting' ? (
                  '连接中...'
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    未连接
                  </>
                )}
              </Badge>
            </CardTitle>
            <Button onClick={runDebugTests} disabled={isRunning}>
              {isRunning ? '测试中...' : '重新测试'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {debugResults.filter(r => r.status === 'success').length}
              </div>
              <div className="text-sm text-gray-600">通过</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {debugResults.filter(r => r.status === 'error').length}
              </div>
              <div className="text-sm text-gray-600">失败</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {debugResults.filter(r => r.status === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">警告</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细测试结果 */}
      <div className="space-y-4">
        {debugResults.map((result, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{result.name}</span>
                </div>
                <Badge className={getStatusColor(result.status)}>
                  {result.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">{result.message}</p>
              
              {result.details && (
                <div className="bg-gray-50 rounded p-3">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 配置信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            配置信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>教室:</strong> {classroomSlug}</div>
          <div><strong>会话ID:</strong> {sessionId || '无'}</div>
          <div><strong>房间ID格式:</strong> classroom:{classroomSlug}:type{sessionId ? `:${sessionId}` : ''}</div>
          <div><strong>认证端点:</strong> /api/liveblocks-auth</div>
          <div><strong>Public Key:</strong> {process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ? 
            process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY.substring(0, 10) + '...' : '未配置'}</div>
        </CardContent>
      </Card>

      {/* 常见问题解决方案 */}
      <Card>
        <CardHeader>
          <CardTitle>🛠️ 常见问题解决方案</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <strong>环境变量未配置:</strong> 在 .env.local 中添加 LIVEBLOCKS_SECRET_KEY 和 NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <strong>认证失败:</strong> 确保用户已登录且是教室成员。检查 server-guard.ts 中的授权逻辑。
            </AlertDescription>
          </Alert>
          
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              <strong>连接失败:</strong> 检查网络连接和 Liveblocks 服务状态。确保域名已添加到 Liveblocks 白名单。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
