import { useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useNoteGrouping } from '@/app/components/features/notes/hooks/useNoteGrouping';
import { useNoteCache } from '@/app/components/features/notes/hooks/useNoteCache';
import { Editor } from '@tiptap/react';

export interface Note {
  id: string;
  title: string;
  content?: string;
  order: number;
}

export function useNoteManager() {
  const { data: session } = useSession();
  const userId = session?.user?.id || 'user-1';
  
  const grouping = useNoteGrouping(userId);
  const noteCache = useNoteCache(userId);

  const [notesList, setNotesList] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialContent, setInitialContent] = useState<string>('');
  
  // Refs for logic that doesn't trigger re-renders or needs immediate access
  const isLoadingContent = useRef(false);
  const isSystemUpdate = useRef(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load list
  const loadNotesList = useCallback(async () => {
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) throw new Error('Failed to fetch notes list');
      const notes: Note[] = await response.json();
      setNotesList(notes);
      return notes;
    } catch (error) {
      console.error('Error loading notes list:', error);
      return [];
    }
  }, []);

  // Save content
  const saveContent = useCallback(async (content: string, noteId?: string) => {
    const targetId = noteId || currentNoteId;
    if (!targetId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (response.ok) {
        setLastSaved(new Date());
        setInitialContent(content);
        noteCache.setCached(targetId, content);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentNoteId, noteCache]);

  // Load content
  const loadNoteContent = useCallback(async (noteId: string, editor: Editor, useCache = true) => {
    if (!editor) return;

    if (useCache) {
      const cachedContent = noteCache.getCached(noteId);
      if (cachedContent !== null) {
        isSystemUpdate.current = true;
        try {
          editor.commands.setContent(cachedContent);
          setInitialContent(cachedContent);
        } finally {
          isSystemUpdate.current = false;
        }

        if (noteCache.needsBackgroundUpdate(noteId)) {
          fetch(`/api/notes/${noteId}`)
            .then(res => res.ok ? res.json() : Promise.reject('Failed'))
            .then((note: Note) => {
              noteCache.setCached(noteId, note.content || '');
              if (currentNoteId === noteId && editor.getHTML() === cachedContent) {
                isSystemUpdate.current = true;
                editor.commands.setContent(note.content || '');
                setInitialContent(note.content || '');
                isSystemUpdate.current = false;
              }
            })
            .catch(console.error);
        }
        return;
      }
    }

    isLoadingContent.current = true;
    try {
      const response = await fetch(`/api/notes/${noteId}`);
      if (!response.ok) throw new Error('Failed');
      const note: Note = await response.json();
      const content = note.content || '';
      
      isSystemUpdate.current = true;
      editor.commands.setContent(content);
      setInitialContent(content);
      isSystemUpdate.current = false;
      
      noteCache.setCached(noteId, content);
    } catch (error) {
      console.error(`Error loading note ${noteId}:`, error);
    } finally {
      setTimeout(() => { isLoadingContent.current = false; }, 100);
    }
  }, [noteCache, currentNoteId]);

  // Helpers
  const clearPendingSave = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
  };

  const saveIfDirty = async (editor: Editor) => {
    if (editor && editor.getHTML() !== initialContent) {
      await saveContent(editor.getHTML());
    }
  };

  // Actions
  const handleSelectNote = async (noteId: string, editor: Editor) => {
    if (noteId === currentNoteId) return;
    clearPendingSave();
    await saveIfDirty(editor);
    setCurrentNoteId(noteId);
    await loadNoteContent(noteId, editor);
  };

  const handleCreateNote = async (editor: Editor, selectNewNote = true, parentId?: string) => {
    clearPendingSave();
    await saveIfDirty(editor);

    setIsCreatingNote(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `新建笔记 ${new Date().toLocaleDateString()}` }),
      });
      if (!response.ok) throw new Error('Failed');
      const newNote: Note = await response.json();
      
      if (parentId) {
        grouping.addToGroup(parentId, newNote.id);
      }
      
      setNotesList(prev => [...prev, newNote]);
      
      if (selectNewNote) {
        setCurrentNoteId(newNote.id);
        isSystemUpdate.current = true;
        editor?.commands.setContent('');
        setInitialContent('');
        isSystemUpdate.current = false;
      }
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string, editor: Editor) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      
      noteCache.invalidateCache(noteId);
      
      const remainingNotes = await loadNotesList(); // Refresh list
      if (remainingNotes.length > 0) {
        if (noteId === currentNoteId) {
          const newCurrentId = remainingNotes[0].id;
          setCurrentNoteId(newCurrentId);
          loadNoteContent(newCurrentId, editor);
        }
      } else {
        await handleCreateNote(editor);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleUpdateTitle = async (noteId: string, newTitle: string) => {
    const originalNotes = notesList;
    setNotesList(prev => prev.map(n => n.id === noteId ? { ...n, title: newTitle } : n));

    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      await loadNotesList();
    } catch (error) {
      console.error('Error updating title:', error);
      setNotesList(originalNotes);
    }
  };

  const handleReorderNotes = async (reorderedNotes: Note[]) => {
    const originalNotes = [...notesList];
    const reorderedMap = new Map(reorderedNotes.map(n => [n.id, n]));
    
    const newNotesList = originalNotes
      .map(note => reorderedMap.get(note.id) || note)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    setNotesList(newNotesList);

    try {
      await fetch('/api/notes/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: reorderedNotes.map(({ id, order }) => ({ id, order })),
        }),
      });
    } catch (error) {
      console.error('Error reordering:', error);
      setNotesList(originalNotes);
    }
  };

  const handleReorderChildNotes = async (parentId: string, reorderedChildNotes: Note[]) => {
    const originalNotes = [...notesList];
    const reorderedMap = new Map(reorderedChildNotes.map(n => [n.id, n]));

    const updatedNotesList = originalNotes.map(note => {
      const reorderedChildNote = reorderedMap.get(note.id);
      return reorderedChildNote ? { ...note, order: reorderedChildNote.order } : note;
    });
    setNotesList(updatedNotesList);
    grouping.updateGroup(parentId, reorderedChildNotes.map(n => n.id));

    try {
      await fetch('/api/notes/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: reorderedChildNotes.map(({ id, order }) => ({ id, order })),
        }),
      });
    } catch (error) {
      console.error('Error reordering child notes:', error);
      setNotesList(originalNotes);
      grouping.updateGroup(parentId, originalNotes.filter(n => grouping.getGroup(parentId)?.includes(n.id)).map(n => n.id));
    }
  };

  return {
    // State
    notesList,
    currentNoteId, setCurrentNoteId,
    isCreatingNote,
    isSaving,
    lastSaved,
    isLoading, setIsLoading,
    userId,
    
    // Refs
    isLoadingContent,
    isSystemUpdate,
    saveTimeout,

    // Methods
    loadNotesList,
    loadNoteContent,
    saveContent,
    handleSelectNote,
    handleCreateNote,
    handleDeleteNote,
    handleUpdateTitle,
    handleReorderNotes,
    handleReorderChildNotes,
    
    // Grouping
    grouping
  };
}
