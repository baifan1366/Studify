'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, Video, Play, Square, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useClassroomLiveSessions } from '@/hooks/classroom/use-classroom-live-sessions';
import { LiveSession } from '@/interface/classroom/live-session-interface';
import LiveClassroom from './live-classroom';

interface SessionManagerProps {
  classroomSlug: string;
  userRole: 'student' | 'tutor';
  userId: string;
  userName: string;
}


export default function SessionManager({
  classroomSlug,
  userRole,
  userId,
  userName
}: SessionManagerProps) {
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
  });

  const {
    sessions,
    isLoading,
    error,
    createSession,
    updateSession,
    deleteSession,
    invalidateQueries
  } = useClassroomLiveSessions(classroomSlug);

  // 检查是否有正在进行的会话
  useEffect(() => {
    const activeSessions = sessions?.filter(session => session.status === 'active');
    if (activeSessions && activeSessions.length > 0) {
      setActiveSession(activeSessions[0]);
    }
  }, [sessions]);

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.starts_at) {
      toast.error('请填写必要信息');
      return;
    }

    try {
      await createSession({
        title: newSession.title,
        description: newSession.description,
        starts_at: new Date(newSession.starts_at).toISOString(),
        ends_at: newSession.ends_at ? new Date(newSession.ends_at).toISOString() : null,
        host_id: userId,
      });

      setShowCreateDialog(false);
      setNewSession({ title: '', description: '', starts_at: '', ends_at: '' });
      toast.success('直播会话创建成功');
      invalidateQueries();
    } catch (error) {
      toast.error('创建失败，请重试');
    }
  };

  const handleStartSession = async (session: LiveSession) => {
    try {
      await updateSession(session.id, { status: 'active' });
      setActiveSession(session);
      toast.success('课堂已开始');
      invalidateQueries();
    } catch (error) {
      toast.error('启动课堂失败');
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      await updateSession(activeSession.id, { 
        status: 'ended',
        ends_at: new Date().toISOString()
      });
      setActiveSession(null);
      toast.success('课堂已结束');
      invalidateQueries();
    } catch (error) {
      toast.error('结束课堂失败');
    }
  };

  const handleJoinSession = (session: LiveSession) => {
    setActiveSession(session);
  };

  const handleLeaveSession = () => {
    setActiveSession(null);
  };

  // 如果正在参与课堂，显示 LiveKit 组件
  if (activeSession) {
    return (
      <LiveClassroom
        classroomSlug={classroomSlug}
        sessionId={activeSession.id}
        participantName={userName}
        userRole={userRole}
        onSessionEnd={userRole === 'tutor' ? handleEndSession : handleLeaveSession}
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-transparent p-2">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">直播课堂</h2>
          <p className="text-muted-foreground">管理和参与实时视频课堂</p>
        </div>
        
        {userRole === 'tutor' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Video className="h-4 w-4 mr-2" />
                创建直播
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建直播会话</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">课堂标题</Label>
                  <Input
                    id="title"
                    value={newSession.title}
                    onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="输入课堂标题"
                  />
                </div>
                <div>
                  <Label htmlFor="description">课堂描述</Label>
                  <Textarea
                    id="description"
                    value={newSession.description}
                    onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="输入课堂描述（可选）"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="starts_at">开始时间</Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={newSession.starts_at}
                      onChange={(e) => setNewSession(prev => ({ ...prev, starts_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ends_at">结束时间（可选）</Label>
                    <Input
                      id="ends_at"
                      type="datetime-local"
                      value={newSession.ends_at}
                      onChange={(e) => setNewSession(prev => ({ ...prev, ends_at: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateSession}>
                    创建
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 会话列表 */}
      <div className="grid gap-4">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              userRole={userRole}
              onStart={() => handleStartSession(session)}
              onJoin={() => handleJoinSession(session)}
              onDelete={() => deleteSession(session.id)}
            />
          ))
        ) : (
          <Card className="bg-transparent p-2">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无直播课堂</h3>
              <p className="text-muted-foreground mb-4">
                {userRole === 'tutor' 
                  ? '创建您的第一个直播课堂，开始与学生互动' 
                  : '等待导师开启直播课堂'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: LiveSession;
  userRole: 'student' | 'tutor';
  onStart: () => void;
  onJoin: () => void;
  onDelete: () => void;
}

function SessionCard({ session, userRole, onStart, onJoin, onDelete }: SessionCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">已安排</Badge>;
      case 'active':
        return <Badge variant="default" className="animate-pulse">进行中</Badge>;
      case 'ended':
        return <Badge variant="outline">已结束</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canStart = userRole === 'tutor' && session.status === 'scheduled';
  const canJoin = session.status === 'active';
  const canDelete = userRole === 'tutor' && session.status !== 'active';

  return (
    <Card className="bg-transparent p-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{session.title}</span>
              {getStatusBadge(session.status)}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {canStart && (
              <Button onClick={onStart} size="sm">
                <Play className="h-4 w-4 mr-2" />
                开始
              </Button>
            )}
            {canJoin && (
              <Button onClick={onJoin} size="sm">
                <Video className="h-4 w-4 mr-2" />
                加入
              </Button>
            )}
            {canDelete && (
              <Button onClick={onDelete} size="sm" variant="outline">
                删除
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>开始: {formatDateTime(session.starts_at)}</span>
          </div>
          {session.ends_at && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>结束: {formatDateTime(session.ends_at)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
