'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveblocksChatPanel } from './liveblocks-chat-panel';
import { CheckCircle, MessageCircle, Users, Settings } from 'lucide-react';

interface ChatIntegrationTestProps {
  classroomSlug: string;
  sessionId?: string;
}

export function ChatIntegrationTest({ classroomSlug, sessionId }: ChatIntegrationTestProps) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [testUser, setTestUser] = useState<'student' | 'tutor'>('student');
  const [userName, setUserName] = useState('测试用户');

  const mockUserInfo = {
    id: `test-${classroomSlug}-${Date.now()}`,
    name: userName,
    avatar: '',
    role: testUser,
  };

  const toggleUserRole = () => {
    setTestUser(prev => prev === 'student' ? 'tutor' : 'student');
    setUserName(prev => prev === '测试用户' ? '测试导师' : '测试用户');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题区域 */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <MessageCircle className="w-6 h-6" />
              Liveblocks 聊天集成测试
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
                <span className="text-slate-400">聊天状态:</span>
                <Badge variant={isChatOpen ? 'default' : 'outline'}>
                  {isChatOpen ? '已打开' : '已关闭'}
                </Badge>
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
                variant="outline"
              >
                切换为{testUser === 'student' ? '导师' : '学生'}
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                重新加载测试
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Card className="bg-slate-700/50 border-slate-600">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    功能检查
                  </h4>
                  <ul className="space-y-1 text-slate-300">
                    <li>✅ 聊天面板显示/隐藏</li>
                    <li>✅ 消息发送功能</li>
                    <li>✅ 表情反应</li>
                    <li>✅ 在线用户列表</li>
                    <li>✅ 角色区分显示</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-700/50 border-slate-600">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    测试场景
                  </h4>
                  <ul className="space-y-1 text-slate-300">
                    <li>📝 发送文字消息</li>
                    <li>😊 发送表情反应</li>
                    <li>👥 查看在线用户</li>
                    <li>🔄 切换用户角色</li>
                    <li>💬 多轮对话测试</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* 模拟直播界面 */}
        <div className="relative bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="flex">
            {/* 主要内容区域 */}
            <div className="flex-1 p-6">
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-slate-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">模拟直播区域</h3>
                  <p className="text-slate-400">这里是视频通话和屏幕共享区域</p>
                  <div className="mt-4 text-sm text-slate-500">
                    教室: {classroomSlug} | 会话: {sessionId || '默认'}
                  </div>
                </div>
              </div>
            </div>

            {/* 聊天面板 - 集成的 Liveblocks 聊天 */}
            <LiveblocksChatPanel
              isOpen={isChatOpen}
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userInfo={mockUserInfo}
            />
          </div>
        </div>

        {/* 说明文档 */}
        <Card className="mt-6 bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-3 text-white">🎯 测试说明</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
              <div>
                <h5 className="font-medium text-white mb-2">基础功能测试:</h5>
                <ol className="list-decimal list-inside space-y-1">
                  <li>确认聊天面板能正常显示和隐藏</li>
                  <li>测试文字消息发送功能</li>
                  <li>测试表情反应功能</li>
                  <li>查看在线用户列表</li>
                </ol>
              </div>
              <div>
                <h5 className="font-medium text-white mb-2">集成验证:</h5>
                <ol className="list-decimal list-inside space-y-1">
                  <li>切换用户角色查看权限差异</li>
                  <li>测试长消息和字数限制</li>
                  <li>验证消息时间戳显示</li>
                  <li>确认UI与直播界面的一致性</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
