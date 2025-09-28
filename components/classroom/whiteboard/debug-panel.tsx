'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useWhiteboards, useCreateWhiteboard, useWhiteboardManager } from '@/hooks/classroom/use-whiteboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DebugPanelProps {
  classroomSlug: string;
  sessionId?: string;
}

export default function DebugPanel({ classroomSlug, sessionId }: DebugPanelProps) {
  const t = useTranslations('WhiteboardDebugPanel');
  const [testSessionId, setTestSessionId] = useState(sessionId || '1');
  const [testWhiteboardId, setTestWhiteboardId] = useState('1');
  
  const { data: whiteboards, isLoading, error } = useWhiteboards(classroomSlug, testSessionId);
  const createWhiteboard = useCreateWhiteboard(classroomSlug);
  const { whiteboard, events } = useWhiteboardManager(classroomSlug, testWhiteboardId);

  const handleCreateTestWhiteboard = async () => {
    try {
      await createWhiteboard.mutateAsync({
        session_id: testSessionId,
        title: `${t('test_whiteboard')} - ${new Date().toLocaleTimeString()}`
      });
    } catch (error) {
      console.error('Failed to create test whiteboard:', error);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold">{t('debug_panel')}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('parameters')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <label className="text-xs text-gray-500">{t('classroom_slug')}:</label>
              <Input value={classroomSlug} disabled className="h-8" />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('session_id')}:</label>
              <Input 
                value={testSessionId} 
                onChange={(e) => setTestSessionId(e.target.value)}
                className="h-8" 
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Whiteboard ID:</label>
              <Input 
                value={testWhiteboardId} 
                onChange={(e) => setTestWhiteboardId(e.target.value)}
                className="h-8" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">API Test Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={handleCreateTestWhiteboard} 
              disabled={createWhiteboard.isPending}
              className="w-full h-8 text-xs"
            >
              {createWhiteboard.isPending ? 'Creating...' : 'Create Test Whiteboard'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Whiteboards Query</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
              <div>Error: {error ? error.message : 'None'}</div>
              <div>Count: {whiteboards?.length || 0}</div>
              <div className="mt-2">
                <strong>Data:</strong>
                <pre className="text-xs bg-gray-200 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(whiteboards, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Whiteboard Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <div>Loading: {whiteboard?.isLoading ? 'Yes' : 'No'}</div>
              <div>Error: {whiteboard?.error ? whiteboard.error.message : 'None'}</div>
              <div className="mt-2">
                <strong>Whiteboard:</strong>
                <pre className="text-xs bg-gray-200 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(whiteboard?.data, null, 2)}
                </pre>
              </div>
              <div className="mt-2">
                <strong>Events Count:</strong> {events?.data?.length || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Network Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600">
            <p>Check browser DevTools Network tab for API requests:</p>
            <ul className="list-disc list-inside mt-1">
              <li>GET /api/classroom/{classroomSlug}/whiteboard</li>
              <li>POST /api/classroom/{classroomSlug}/whiteboard</li>
              <li>GET /api/classroom/{classroomSlug}/whiteboard/{testWhiteboardId}</li>
              <li>GET /api/classroom/{classroomSlug}/whiteboard/{testWhiteboardId}/events</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
