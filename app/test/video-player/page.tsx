'use client';

import React from 'react';
import BilibiliVideoPlayer from '@/components/video/bilibili-video-player';
import { useDanmaku } from '@/hooks/video/use-danmaku';
import { useVideoComments } from '@/hooks/video/use-video-comments';

export default function VideoPlayerTestPage() {
  const { addMessage, messages, isEnabled, setIsEnabled } = useDanmaku({
    maxVisible: 100,
    colors: ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  });

  const { comments, addComment, toggleLike, loadComments } = useVideoComments({
    videoId: 'test-video-1',
    userId: 'current-user'
  });

  // Mock danmaku messages
  const mockDanmakuMessages = [
    {
      id: '1',
      text: '这个讲得太好了！',
      color: '#FFFFFF',
      size: 'medium' as const,
      position: 0.1,
      timestamp: Date.now() - 1000,
      userId: 'user1',
      username: '学习达人'
    },
    {
      id: '2',
      text: '前排围观',
      color: '#FF6B6B',
      size: 'small' as const,
      position: 0.15,
      timestamp: Date.now() - 2000,
      userId: 'user2',
      username: '小明'
    },
    {
      id: '3',
      text: '老师讲得很清楚',
      color: '#4ECDC4',
      size: 'medium' as const,
      position: 0.3,
      timestamp: Date.now() - 3000,
      userId: 'user3',
      username: '编程小白'
    },
    {
      id: '4',
      text: '666666',
      color: '#45B7D1',
      size: 'large' as const,
      position: 0.5,
      timestamp: Date.now() - 4000,
      userId: 'user4',
      username: '大神'
    }
  ];

  // Mock comments
  const mockComments = [
    {
      id: 'comment-1',
      userId: 'user-1',
      username: '小明同学',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
      content: '这个视频讲得真好！学到了很多东西，特别是关于React Hooks的部分，之前一直不太理解，现在终于明白了。',
      timestamp: Date.now() - 3600000,
      likes: 12,
      isLiked: false,
      replies: [
        {
          id: 'reply-1',
          userId: 'user-2',
          username: '学习达人',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xuexidaren',
          content: '同感！老师讲得很清楚，我也是看了这个视频才理解的',
          timestamp: Date.now() - 3000000,
          likes: 3,
          isLiked: true,
          replies: []
        }
      ]
    },
    {
      id: 'comment-2',
      userId: 'user-3',
      username: '编程小白',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaobai',
      content: '有没有相关的练习题？想巩固一下学到的知识点',
      timestamp: Date.now() - 7200000,
      likes: 8,
      isLiked: false,
      replies: []
    },
    {
      id: 'comment-3',
      userId: 'user-4',
      username: '前端工程师',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=frontend',
      content: '这个视频质量真的很高，制作精良，内容也很实用。希望能出更多这样的教程！',
      timestamp: Date.now() - 10800000,
      likes: 15,
      isLiked: true,
      replies: [
        {
          id: 'reply-2',
          userId: 'user-5',
          username: '视频作者',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=author',
          content: '谢谢支持！后续会继续更新更多优质内容',
          timestamp: Date.now() - 9000000,
          likes: 5,
          isLiked: false,
          replies: []
        }
      ]
    }
  ];

  const handleDanmakuSend = (message: string) => {
    // In a real app, this would send to your backend
    console.log('Sending danmaku:', message);
    
    // Add to local state for demo
    addMessage(message, 0.5, {
      color: '#FFFFFF',
      size: 'medium',
      userId: 'current-user',
      username: '当前用户'
    });
  };

  const handleCommentSend = (content: string) => {
    // In a real app, this would send to your backend
    console.log('Sending comment:', content);
    
    // Add to local state for demo
    addComment(content);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Import the CSS */}
      <link rel="stylesheet" href="/styles/video-player.css" />
      
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <BilibiliVideoPlayer
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            title="React Hooks 完整教程 - 从入门到精通"
            poster="https://peach.blender.org/wp-content/uploads/title_anouncement.jpg"
            danmakuMessages={mockDanmakuMessages}
            comments={mockComments}
            onDanmakuSend={handleDanmakuSend}
            onCommentSend={handleCommentSend}
          />
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Bilibili风格视频播放器功能说明</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">🎮 快捷键操作</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span><kbd className="bg-gray-100 px-2 py-1 rounded">Space</kbd></span>
                  <span>播放/暂停</span>
                </div>
                <div className="flex justify-between">
                  <span><kbd className="bg-gray-100 px-2 py-1 rounded">←/→</kbd></span>
                  <span>快退/快进10秒</span>
                </div>
                <div className="flex justify-between">
                  <span><kbd className="bg-gray-100 px-2 py-1 rounded">↑/↓</kbd></span>
                  <span>音量调节</span>
                </div>
                <div className="flex justify-between">
                  <span><kbd className="bg-gray-100 px-2 py-1 rounded">M</kbd></span>
                  <span>静音切换</span>
                </div>
                <div className="flex justify-between">
                  <span><kbd className="bg-gray-100 px-2 py-1 rounded">F</kbd></span>
                  <span>全屏切换</span>
                </div>
                <div className="flex justify-between">
                  <span><kbd className="bg-gray-100 px-2 py-1 rounded">D</kbd></span>
                  <span>弹幕开关</span>
                </div>
                <div className="flex justify-between">
                  <span><kbd className="bg-gray-100 px-2 py-1 rounded">C</kbd></span>
                  <span>评论开关</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">✨ 主要功能</h3>
              <ul className="space-y-2 text-sm">
                <li>• 🎬 完整的视频播放控制</li>
                <li>• 💬 实时弹幕系统</li>
                <li>• 📝 评论区互动</li>
                <li>• ⚙️ 播放设置面板</li>
                <li>• 🌐 自动翻译功能</li>
                <li>• 📱 响应式设计</li>
                <li>• ⌨️ 全键盘快捷键</li>
                <li>• 🎨 Bilibili风格UI</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 使用提示</h4>
            <p className="text-blue-800 text-sm">
              这是一个完整的Bilibili风格视频播放器组件，包含了弹幕、评论、设置等所有主要功能。
              你可以点击视频上方的弹幕按钮发送弹幕，在下方评论区发表评论。
              所有的键盘快捷键都已实现，提供了流畅的观看体验。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
