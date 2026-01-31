import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Note } from '@/db/schema';
import * as noteRepo from '@/db/repositories/notes';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await noteRepo.listNotes({ query });
      setNotes(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pinned = useMemo(() => notes.filter((n) => n.isPinned), [notes]);
  const recent = useMemo(() => notes.slice(0, 30), [notes]);

  const create = useCallback(async (data: Parameters<typeof noteRepo.createNote>[0]) => {
    const created = await noteRepo.createNote(data);
    setNotes((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Parameters<typeof noteRepo.updateNote>[1]) => {
    const updated = await noteRepo.updateNote(id, patch);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await noteRepo.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const getById = useCallback(async (id: string) => {
    return await noteRepo.getNoteById(id);
  }, []);

  const togglePin = useCallback(async (id: string, isPinned: boolean) => {
    const updated = await noteRepo.togglePin(id, isPinned);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, []);

  return {
    notes,
    pinned,
    recent,
    query,
    setQuery,
    isLoading,
    error,
    refresh,
    create,
    update,
    remove,
    getById,
    togglePin,
  };
}