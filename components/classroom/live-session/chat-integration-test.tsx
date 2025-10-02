'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SessionChatPanel } from './liveblocks-chat-panel';
import { AlertCircle, MessageCircle, Users, Settings, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChatIntegrationTestProps {
  classroomSlug: string;
  sessionId?: string;
}

/**
 * ✅ 重构后的聊天集成测试组件
 * 
 * 修复问题：
 * 1. 使用稳定的用户 ID（不会在重渲染时改变）
 * 2. 更新为使用 SessionChatPanel
 * 3. 提供模拟的 participants 列表
 * 4. 明确说明这是单机测试，不能测试实时通信
 * 5. 条件化调试代码
 */
export function ChatIntegrationTest({ classroomSlug, sessionId }: ChatIntegrationTestProps) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [testUser, setTestUser] = useState<'student' | 'tutor'>('student');
  const [userName, setUserName] = useState('测试用户');

  // 🎯 关键修复：生成稳定的用户 ID（组件生命周期内不变）
  const stableUserId = useMemo(
    () => `test-user-${Math.random().toString(36).substr(2, 9)}`,
    [] // 空依赖数组 = 只在首次挂载时执行
  );

  const mockUserInfo = {
    id: stableUserId, // ✅ 使用稳定的 ID
    name: userName,
    avatar: '',
    role: testUser,
  };

  // 🎯 修复：提供模拟的参与者列表
  const mockParticipants = useMemo(() => [
    {
      identity: stableUserId,
      displayName: userName,
      avatarUrl: '',
      role: testUser,
    },
    {
      identity: 'mock-student-1',
      displayName: '模拟学生A',
      avatarUrl: '',
      role: 'student',
    },
    {
      identity: 'mock-tutor-1',
      displayName: '模拟导师B',
      avatarUrl: '',
      role: 'tutor',
    },
  ], [stableUserId, userName, testUser]);

  const toggleUserRole = () => {
    setTestUser(prev => prev === 'student' ? 'tutor' : 'student');
    setUserName(prev => prev === '测试用户' ? '测试导师' : '测试用户');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* 🎯 重要警告：测试限制说明 */}
        <Alert className="mb-6 bg-yellow-900/30 border-yellow-700">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>⚠️ 测试环境限制</AlertTitle>
          <AlertDescription className="space-y-2 text-sm">
            <p>
              <strong>这是一个单机测试环境</strong>，只能验证以下功能：
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>✅ UI 布局和样式</li>
              <li>✅ 消息发送和显示</li>
              <li>✅ localStorage 本地持久化</li>
              <li>✅ 表情反应功能</li>
            </ul>
            <p className="mt-2 text-yellow-200">
              <strong>⚠️ 无法测试实时通信：</strong>
            </p>
            <p className="text-yellow-100">
              要测试真正的多用户实时聊天，请在两个独立的浏览器窗口中打开课堂页面，
              一个使用导师身份，一个使用学生身份，然后验证消息是否能跨窗口传输。
            </p>
          </AlertDescription>
        </Alert>

        {/* 标题区域 */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <MessageCircle className="w-6 h-6" />
              SessionChat 单机测试
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-400">教室:</span>
                <div className="font-medium">{classroomSlug}</div>
              </div>
              <div>
                <span className="text-slate-400">会话ID:</span>
                <div className="font-medium">{sessionId || '默认会话'}</div>
              </div>
              <div>
                <span className="text-slate-400">用户角色:</span>
                <Badge variant={testUser === 'tutor' ? 'default' : 'secondary'}>
                  {testUser === 'tutor' ? '导师' : '学生'}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400">用户ID:</span>
                <div className="font-mono text-xs text-slate-400">{stableUserId}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 控制面板 */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Settings className="w-5 h-5" />
              测试控制
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setIsChatOpen(!isChatOpen)}
                variant={isChatOpen ? 'default' : 'outline'}
              >
                {isChatOpen ? '关闭聊天' : '打开聊天'}
              </Button>
              
              <Button
                onClick={toggleUserRole}
                variant="secondary"
              >
                切换为 {testUser === 'student' ? '导师' : '学生'}
              </Button>

              <Button
                onClick={() => {
                  const key = `chat:${classroomSlug}:${sessionId || 'default'}`;
                  localStorage.removeItem(key);
                  window.location.reload();
                }}
                variant="destructive"
              >
                清除历史记录
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-green-400" />
                可以测试的功能
              </h4>
              <ul className="space-y-1 text-slate-300 text-sm">
                <li>✅ 发送文字消息</li>
                <li>✅ 发送表情反应</li>
                <li>✅ 查看消息历史（刷新页面后恢复）</li>
                <li>✅ 模拟在线用户列表显示</li>
                <li>✅ 角色区分显示</li>
                <li>✅ UI 响应和布局</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                无法测试的功能
              </h4>
              <ul className="space-y-1 text-slate-300 text-sm">
                <li>❌ 跨用户实时消息传输</li>
                <li>❌ 真实的在线用户状态</li>
                <li>❌ 用户加入/离开通知</li>
                <li>❌ LiveKit DataChannel 通信</li>
                <li>❌ 多设备同步</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* 测试区域 - 主要内容 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 聊天面板 */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 h-[600px]">
              <CardContent className="p-0 h-full">
                <SessionChatPanel
                  isOpen={isChatOpen}
                  classroomSlug={classroomSlug}
                  sessionId={sessionId || 'test-session'}
                  userInfo={mockUserInfo}
                  participants={mockParticipants} // 🎯 传递模拟参与者
                />
              </CardContent>
            </Card>
          </div>

          {/* 测试指南 */}
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  测试步骤
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong className="text-white">1. 单机测试</strong>
                  <p className="text-slate-400 mt-1">发送几条消息，验证显示正常</p>
                </div>
                <div>
                  <strong className="text-white">2. 角色切换</strong>
                  <p className="text-slate-400 mt-1">切换角色，验证 UI 更新</p>
                </div>
                <div>
                  <strong className="text-white">3. 持久化测试</strong>
                  <p className="text-slate-400 mt-1">刷新页面，验证消息保留</p>
                </div>
                <div>
                  <strong className="text-white">4. 清理测试</strong>
                  <p className="text-slate-400 mt-1">清除历史，验证重置功能</p>
                </div>
                
                <div className="pt-3 border-t border-slate-700">
                  <strong className="text-yellow-400">5. 实时通信测试（必须）</strong>
                  <p className="text-slate-300 mt-1">
                    打开第二个浏览器窗口，使用不同角色，验证消息能否跨窗口传输
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">调试信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400">localStorage Key:</span>
                  <div className="text-slate-300 break-all">
                    chat:{classroomSlug}:{sessionId || 'default'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Current User ID:</span>
                  <div className="text-slate-300">{stableUserId}</div>
                </div>
                <div>
                  <span className="text-slate-400">Mock Participants:</span>
                  <div className="text-slate-300">{mockParticipants.length} users</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🎯 条件化调试样式
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const existingStyle = document.head.querySelector('#chat-test-debug-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'chat-test-debug-styles';
    style.textContent = `
      /* 开发环境调试样式 */
      .chat-test-debug {
        outline: 1px dashed rgba(255, 255, 0, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
}
