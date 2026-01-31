import { desc, eq, like, or } from 'drizzle-orm';
import { db, generateId } from '../database';
import { notes, Note, NewNote } from '../schema';

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function normalizeNote(row: Note): Note {
  // Drizzle may return json-text fields as strings depending on driver
  return {
    ...row,
    tags: parseJsonField<string[]>(row.tags, []),
    linkedHabitIds: parseJsonField<string[]>(row.linkedHabitIds, []),
    linkedGoalIds: parseJsonField<string[]>(row.linkedGoalIds, []),
  } as Note;
}

export async function listNotes(params?: {
  query?: string;
  pinnedOnly?: boolean;
}): Promise<Note[]> {
  const query = params?.query?.trim();
  const pinnedOnly = !!params?.pinnedOnly;

  let rows: Note[];

  if (query) {
    // basic LIKE search on title/content
    rows = await db
      .select()
      .from(notes)
      .where(
        or(
          like(notes.title, `%${query}%`),
          like(notes.content, `%${query}%`)
        )
      )
      .orderBy(desc(notes.updatedAt));
  } else if (pinnedOnly) {
    rows = await db
      .select()
      .from(notes)
      .where(eq(notes.isPinned, true))
      .orderBy(desc(notes.updatedAt));
  } else {
    rows = await db.select().from(notes).orderBy(desc(notes.updatedAt));
  }

  return rows.map(normalizeNote);
}

export async function getNoteById(id: string): Promise<Note | null> {
  const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0] ? normalizeNote(rows[0]) : null;
}

export async function createNote(data: {
  title?: string;
  content: string;
  tags?: string[];
  lifeArea?: Note['lifeArea'] | null;
  linkedHabitIds?: string[];
  linkedGoalIds?: string[];
  isPinned?: boolean;
}): Promise<Note> {
  const now = new Date();
  const id = generateId();

  const newNote: NewNote = {
    id,
    title: data.title?.trim() || null,
    content: data.content.trim(),
    tags: (data.tags ?? []).filter(Boolean),
    lifeArea: data.lifeArea ?? null,
    linkedHabitIds: (data.linkedHabitIds ?? []).filter(Boolean),
    linkedGoalIds: (data.linkedGoalIds ?? []).filter(Boolean),
    isPinned: data.isPinned ?? false,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(notes).values(newNote);

  const created = await getNoteById(id);
  if (!created) throw new Error('Failed to create note');
  return created;
}

export async function updateNote(
  id: string,
  patch: Partial<{
    title: string | null;
    content: string;
    tags: string[];
    lifeArea: Note['lifeArea'] | null;
    linkedHabitIds: string[];
    linkedGoalIds: string[];
    isPinned: boolean;
  }>
): Promise<Note> {
  await db
    .update(notes)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(notes.id, id));

  const updated = await getNoteById(id);
  if (!updated) throw new Error('Failed to update note');
  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  await db.delete(notes).where(eq(notes.id, id));
}

export async function togglePin(id: string, isPinned: boolean): Promise<Note> {
  return updateNote(id, { isPinned });
}