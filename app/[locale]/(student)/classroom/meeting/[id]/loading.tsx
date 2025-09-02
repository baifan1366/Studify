import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MeetingLoading() {
  return (
    <div className="flex flex-col w-full h-screen">
      {/* 顶部导航栏骨架 */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-8 w-32" />
        <div className="flex space-x-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      
      {/* 主内容区域骨架 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 视频区域骨架 */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        
        {/* 侧边栏骨架 */}
        <div className="w-80 border-l p-4 flex flex-col">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}