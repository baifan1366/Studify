'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useWhiteboards, useCreateWhiteboard, useDeleteWhiteboard, WhiteboardSession } from '@/hooks/classroom/use-whiteboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Users } from 'lucide-react';
import { WhiteboardCanvas } from '../live-session/whiteboard-canvas';

interface WhiteboardManagerProps {
  classroomSlug: string;
  sessionId: string;
  userRole: 'student' | 'tutor';
  isSessionActive?: boolean;
}

export default function WhiteboardManager({ 
  classroomSlug, 
  sessionId, 
  userRole,
  isSessionActive = true 
}: WhiteboardManagerProps) {
  const t = useTranslations('WhiteboardManager');
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<WhiteboardSession | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWhiteboardTitle, setNewWhiteboardTitle] = useState('');

  const { data: whiteboards, isLoading, error } = useWhiteboards(classroomSlug, sessionId);
  const createWhiteboard = useCreateWhiteboard(classroomSlug);
  const deleteWhiteboard = useDeleteWhiteboard(classroomSlug);

  const handleCreateWhiteboard = async () => {
    try {
      await createWhiteboard.mutateAsync({
        session_id: sessionId,
        title: newWhiteboardTitle || `${t('whiteboard')} - ${new Date().toLocaleString()}`
      });
      setNewWhiteboardTitle('');
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create whiteboard:', error);
    }
  };

  const handleDeleteWhiteboard = async (whiteboardId: string) => {
    if (!confirm('Are you sure you want to delete this whiteboard?')) return;
    
    try {
      await deleteWhiteboard.mutateAsync(whiteboardId);
      if (selectedWhiteboard?.id.toString() === whiteboardId) {
        setSelectedWhiteboard(null);
      }
    } catch (error) {
      console.error('Failed to delete whiteboard:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading whiteboards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Failed to load whiteboards</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Whiteboard List */}
      <div className="w-80 border-r bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Whiteboards</h3>
          {userRole === 'tutor' && isSessionActive && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Whiteboard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Whiteboard title (optional)"
                    value={newWhiteboardTitle}
                    onChange={(e) => setNewWhiteboardTitle(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateWhiteboard}
                      disabled={createWhiteboard.isPending}
                    >
                      {createWhiteboard.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-2">
          {whiteboards?.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No whiteboards yet</p>
              {userRole === 'tutor' && isSessionActive && (
                <p className="text-sm mt-1">Create one to get started</p>
              )}
            </div>
          ) : (
            whiteboards?.map((whiteboard) => (
              <Card
                key={whiteboard.id}
                className={`cursor-pointer transition-all ${
                  selectedWhiteboard?.id === whiteboard.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedWhiteboard(whiteboard)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm truncate">
                      {whiteboard.title}
                    </CardTitle>
                    {userRole === 'tutor' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWhiteboard(whiteboard.id.toString());
                        }}
                        disabled={deleteWhiteboard.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-gray-500">
                    Created: {new Date(whiteboard.created_at).toLocaleDateString()}
                  </div>
                  {whiteboard.updated_at !== whiteboard.created_at && (
                    <div className="text-xs text-gray-500">
                      Updated: {new Date(whiteboard.updated_at).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Whiteboard Canvas */}
      <div className="flex-1">
        {selectedWhiteboard ? (
          <WhiteboardCanvas
            classroomSlug={classroomSlug}
            whiteboardId={selectedWhiteboard.id.toString()}
            isReadOnly={!isSessionActive || (userRole === 'student' && !isSessionActive)}
            className="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center text-gray-500">
              <Edit className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a whiteboard</h3>
              <p>Choose a whiteboard from the sidebar to start collaborating</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
