'use client';

import React, { useState } from 'react';
import { Clock, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCourseNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/course/use-course-notes';
import { useToast } from '@/hooks/use-toast';

interface CourseNote {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  timestampSec?: number;
  content: string;
  aiSummary?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CourseNoteContentProps {
  currentLessonId?: number;
  currentTimestamp?: number;
  onTimeUpdate?: (time: number) => void;
  lessonKind?: string; // Add lesson kind to determine if video
}

export default function CourseNoteContent({ 
  currentLessonId, 
  currentTimestamp = 0,
  onTimeUpdate,
  lessonKind 
}: CourseNoteContentProps) {
  const [noteContent, setNoteContent] = useState('');
  const [noteTimestamp, setNoteTimestamp] = useState(currentTimestamp);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTimestamp, setEditingTimestamp] = useState(0);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // Check if this is a video lesson
  const isVideoLesson = lessonKind === 'video';
  
  // Use default timestamp for non-video lessons
  const defaultTimestamp = 0; // 00:00

  const { data: notes } = useCourseNotes(currentLessonId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { toast } = useToast();

  // Update noteTimestamp when currentTimestamp changes (only for video lessons)
  React.useEffect(() => {
    if (isVideoLesson) {
      setNoteTimestamp(currentTimestamp);
    } else {
      setNoteTimestamp(defaultTimestamp);
    }
  }, [currentTimestamp, isVideoLesson]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const parseTimeInput = (timeStr: string) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return parseInt(timeStr) || 0;
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim() || !currentLessonId) return;
    
    try {
      await createNote.mutateAsync({
        lessonId: currentLessonId,
        content: noteContent,
        timestampSec: isVideoLesson ? noteTimestamp : defaultTimestamp
      });
      
      setNoteContent('');
      if (isVideoLesson) {
        setNoteTimestamp(currentTimestamp);
      }
      toast({
        title: 'Note Saved',
        description: 'Your note has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStartEdit = (note: CourseNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setEditingTimestamp(note.timestampSec || 0);
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId) return;
    
    try {
      await updateNote.mutateAsync({
        noteId: editingNoteId,
        content: editingContent,
        timestampSec: editingTimestamp,
      });
      
      setEditingNoteId(null);
      setEditingContent('');
      setEditingTimestamp(0);
      
      toast({
        title: 'Note Updated',
        description: 'Your note has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent('');
    setEditingTimestamp(0);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      
      setDeleteNoteId(null);
      toast({
        title: 'Note Deleted',
        description: 'Your note has been deleted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Note Creation Form */}
      <div className="space-y-2">
        {/* Timestamp Input - Only show for video lessons */}
        {isVideoLesson && (
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Timestamp:</span>
            <Input
              type="text"
              value={formatTime(noteTimestamp)}
              onChange={(e) => setNoteTimestamp(parseTimeInput(e.target.value))}
              placeholder="0:00"
              className="w-20 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setNoteTimestamp(currentTimestamp);
                if (onTimeUpdate) onTimeUpdate(currentTimestamp);
              }}
              className="text-xs"
            >
              Current
            </Button>
          </div>
        )}
        
        {/* Note Content */}
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Add a note at this timestamp..."
          className="w-full h-20 sm:h-24 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-gray-800"
        />
        
        {/* Save Button */}
        <Button
          onClick={handleCreateNote}
          disabled={!noteContent.trim() || createNote.isPending}
          variant="default"
          className="w-full"
        >
          {createNote.isPending ? 'Saving...' : 'Save Note'}
        </Button>
      </div>

      {/* Existing Notes */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Your Notes</h4>
        
        {notes && notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              {/* Note Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock size={12} />
                  <span>
                    {isVideoLesson && (note.timestampSec ?? 0) > 0 ? formatTime(note.timestampSec ?? 0) + ' - ' : ''}
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {/* Edit/Delete Actions */}
                {editingNoteId !== note.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(note)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteNoteId(note.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Note Content */}
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  {/* Edit Timestamp - Only show for video lessons */}
                  {isVideoLesson && (
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-gray-400" />
                      <Input
                        type="text"
                        value={formatTime(editingTimestamp)}
                        onChange={(e) => setEditingTimestamp(parseTimeInput(e.target.value))}
                        className="w-20 text-xs h-8"
                      />
                    </div>
                  )}
                  
                  {/* Edit Content */}
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full h-16 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:border-orange-500"
                  />
                  
                  {/* Edit Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateNote.isPending}
                      className="h-8 text-xs"
                    >
                      <Save size={12} className="mr-1" />
                      {updateNote.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-8 text-xs"
                    >
                      <X size={12} className="mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-800 dark:text-gray-200 text-sm">{note.content}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No notes yet. Start taking notes as you watch!
          </p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteNoteId !== null} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNoteId && handleDeleteNote(deleteNoteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}