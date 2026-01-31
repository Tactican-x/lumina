import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { Input, TextArea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';

import { colors, spacing, typography } from '@/constants/theme';
import { useHabits, useGoals, useNoteEditor } from '@/hooks';

export default function NoteDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = String(id);

  const { habits } = useHabits();
  const { goals } = useGoals();

  const {
    note,
    isLoading,
    error,

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

    save,
    remove,
  } = useNoteEditor(noteId);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleHabitLink = (hid: string) => {
    setLinkedHabitIds((prev: string[]) =>
      prev.includes(hid) ? prev.filter((x: string) => x !== hid) : [...prev, hid]
    );
  };

  const toggleGoalLink = (gid: string) => {
    setLinkedGoalIds((prev: string[]) =>
      prev.includes(gid) ? prev.filter((x: string) => x !== gid) : [...prev, gid]
    );
  };

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Note" variant="fullscreen">
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!note && !isLoading ? (
          <Text style={styles.muted}>Note not found.</Text>
        ) : (
          <>
            <Input label="Title (optional)" value={title} onChangeText={setTitle} placeholder="Title" />
            <TextArea label="Content" value={content} onChangeText={setContent} placeholder="Write…" />
            <Input label="Tags (comma separated)" value={tagsText} onChangeText={setTagsText} placeholder="sleep, focus" />

            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.slice(0, 8).map((t: string) => (
                  <Badge key={t} label={t} variant="info" size="sm" />
                ))}
              </View>
            )}

            <Toggle
              label="Pinned"
              description="Pinned notes appear at the top of Codex"
              value={pinned}
              onValueChange={setPinned}
            />

            <Input
              label="Life area (optional)"
              value={lifeArea ?? ''}
              onChangeText={(v: string) => setLifeArea(v.trim() ? v.trim() : null)}
              placeholder="health, career, learning…"
            />

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionTitle}>Linked Habits</Text>
              <View style={styles.linkRow}>
                {habits.slice(0, 10).map((h) => {
                  const selected = linkedHabitIds.includes(h.id);
                  return (
                    <Button
                      key={h.id}
                      title={h.name}
                      variant={selected ? 'primary' : 'outline'}
                      onPress={() => toggleHabitLink(h.id)}
                    />
                  );
                })}
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionTitle}>Linked Goals</Text>
              <View style={styles.linkRow}>
                {goals.slice(0, 8).map((g) => {
                  const selected = linkedGoalIds.includes(g.id);
                  return (
                    <Button
                      key={g.id}
                      title={g.title}
                      variant={selected ? 'primary' : 'outline'}
                      onPress={() => toggleGoalLink(g.id)}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                title="Delete"
                variant="danger"
                loading={deleting}
                onPress={async () => {
                  setDeleting(true);
                  try {
                    await remove();
                    router.back();
                  } finally {
                    setDeleting(false);
                  }
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button title="Close" variant="ghost" onPress={() => router.back()} />
                <Button
                  title="Save"
                  loading={saving}
                  disabled={!content.trim()}
                  onPress={async () => {
                    setSaving(true);
                    try {
                      await save();
                      router.back();
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              </View>
            </View>
          </>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  muted: { color: colors.text.secondary, marginTop: spacing.md },
  errorText: { color: colors.danger.main, marginBottom: spacing.sm },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },

  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  actions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: 10,
  },
});