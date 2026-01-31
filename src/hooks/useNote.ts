import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Note } from '@/db/schema';
import * as noteRepo from '@/db/repositories/notes';

export function useNote(noteId: string) {
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const n = await noteRepo.getNoteById(noteId);
      setNote(n);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load note');
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Parameters<typeof noteRepo.updateNote>[1]) => {
      const updated = await noteRepo.updateNote(noteId, patch);
      setNote(updated);
      return updated;
    },
    [noteId]
  );

  const remove = useCallback(async () => {
    await noteRepo.deleteNote(noteId);
    setNote(null);
  }, [noteId]);

  const togglePin = useCallback(
    async (isPinned: boolean) => {
      const updated = await noteRepo.togglePin(noteId, isPinned);
      setNote(updated);
      return updated;
    },
    [noteId]
  );

  return {
    note,
    isLoading,
    error,
    refresh,
    update,
    remove,
    togglePin,
  };
}

/**
 * useNoteEditor(noteId)
 * Convenience editor hook:
 * - loads note
 * - exposes editable fields
 * - provides save/remove
 */
export function useNoteEditor(noteId: string) {
  const { note, isLoading, error, refresh, update, remove, togglePin } = useNote(noteId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [lifeArea, setLifeArea] = useState<string | null>(null);
  const [linkedHabitIds, setLinkedHabitIds] = useState<string[]>([]);
  const [linkedGoalIds, setLinkedGoalIds] = useState<string[]>([]);
  const [pinned, setPinnedState] = useState(false);

  // Sync loaded note into editor state
  useEffect(() => {
    if (!note) return;

    setTitle(note.title ?? '');
    setContent(note.content ?? '');
    setTagsText((note.tags ?? []).join(', '));
    setLifeArea((note.lifeArea as any) ?? null);
    setLinkedHabitIds((note.linkedHabitIds as any) ?? []);
    setLinkedGoalIds((note.linkedGoalIds as any) ?? []);
    setPinnedState(!!note.isPinned);
  }, [note?.id]);

  const tags = useMemo(
    () =>
      tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsText]
  );

  const save = useCallback(async () => {
    if (!content.trim()) {
      throw new Error('Content is required');
    }

    const updated = await update({
      title: title.trim() || null,
      content: content.trim(),
      tags,
      lifeArea: lifeArea as any,
      linkedHabitIds,
      linkedGoalIds,
      isPinned: pinned,
    } as any);

    return updated;
  }, [title, content, tags, lifeArea, linkedHabitIds, linkedGoalIds, pinned, update]);

  const setPinned = useCallback(
    async (value: boolean) => {
      setPinnedState(value);
      // persist pin state immediately
      await togglePin(value);
    },
    [togglePin]
  );

  return {
    // base
    note,
    isLoading,
    error,
    refresh,

    // editor state
    title,
    setTitle,
    content,
    setContent,
    tagsText,
    setTagsText,
    tags,

    lifeArea,
    setLifeArea,

    linkedHabitIds,
    setLinkedHabitIds,
    linkedGoalIds,
    setLinkedGoalIds,

    pinned,
    setPinned,

    // actions
    save,
    remove,
  };
}