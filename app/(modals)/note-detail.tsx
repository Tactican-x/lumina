import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Modal } from '@/components/ui/Modal';
import { Input, TextArea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Pin, Calendar } from '@/components/ui/Lucide';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useHabits, useGoals, useNoteEditor } from '@/hooks';
import { formatInsightDate } from '@/utils/date';

export default function NoteDetailModal() {
  const insets = useSafeAreaInsets();
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

  // View vs Edit mode
  const [isEditing, setIsEditing] = useState(false);
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

  // Resolve linked names for view mode
  const linkedHabitNames = habits
    .filter((h) => linkedHabitIds.includes(h.id))
    .map((h) => h.name);

  const linkedGoalNames = goals
    .filter((g) => linkedGoalIds.includes(g.id))
    .map((g) => g.title);

  // ==========================================
  // VIEW MODE
  // ==========================================
  const renderViewMode = () => (
    <>
      {/* Title */}
      {title ? (
        <Text style={styles.viewTitle}>{title}</Text>
      ) : (
        <Text style={[styles.viewTitle, styles.untitled]}>Untitled Note</Text>
      )}

      {/* Meta row: date + pinned */}
      <View style={styles.metaRow}>
        {note?.createdAt && (
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.text.tertiary} />
            <Text style={styles.metaText}>
              {formatInsightDate(note.createdAt)}
            </Text>
          </View>
        )}

        {pinned && (
          <View style={styles.metaItem}>
            <Pin size={12} color={colors.brand.primary} />
            <Text style={[styles.metaText, { color: colors.brand.primary }]}>
              Pinned
            </Text>
          </View>
        )}

        {lifeArea && (
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>{lifeArea}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <Card variant="default" padding="md" style={styles.contentCard}>
        <Text style={styles.viewContent}>
          {content || 'No content'}
        </Text>
      </Card>

      {/* Tags */}
      {tags.length > 0 && (
        <View style={styles.viewSection}>
          <View style={styles.viewSectionHeader}>
            <Feather name="tag" size={14} color={colors.text.tertiary} />
            <Text style={styles.viewSectionTitle}>Tags</Text>
          </View>
          <View style={styles.tagsRow}>
            {tags.map((t: string) => (
              <Badge key={t} label={t} variant="info" size="sm" />
            ))}
          </View>
        </View>
      )}

      {/* Linked habits */}
      {linkedHabitNames.length > 0 && (
        <View style={styles.viewSection}>
          <View style={styles.viewSectionHeader}>
            <Feather name="link" size={14} color={colors.text.tertiary} />
            <Text style={styles.viewSectionTitle}>Linked Habits</Text>
          </View>
          <View style={styles.tagsRow}>
            {linkedHabitNames.map((name) => (
              <Badge key={name} label={name} variant="default" size="sm" />
            ))}
          </View>
        </View>
      )}

      {/* Linked goals */}
      {linkedGoalNames.length > 0 && (
        <View style={styles.viewSection}>
          <View style={styles.viewSectionHeader}>
            <Feather name="link" size={14} color={colors.text.tertiary} />
            <Text style={styles.viewSectionTitle}>Linked Goals</Text>
          </View>
          <View style={styles.tagsRow}>
            {linkedGoalNames.map((name) => (
              <Badge key={name} label={name} variant="default" size="sm" />
            ))}
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.viewActions}>
        <Button
          title="Edit Note"
          variant="primary"
          icon={<Feather name="edit-2" size={16} color="#fff" />}
          onPress={() => setIsEditing(true)}
          style={styles.viewActionButton}
        />

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
          style={styles.viewActionButton}
        />
      </View>
    </>
  );

  // ==========================================
  // EDIT MODE
  // ==========================================
  const renderEditMode = () => (
    <>
      <Input
        label="Title (optional)"
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        autoFocus
      />

      <TextArea
        label="Content"
        value={content}
        onChangeText={setContent}
        placeholder="Writeâ€¦"
      />

      <Input
        label="Tags (comma separated)"
        value={tagsText}
        onChangeText={setTagsText}
        placeholder="sleep, focus"
      />

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
        onChangeText={(v: string) =>
          setLifeArea(v.trim() ? v.trim() : null)
        }
        placeholder="health, career, learningâ€¦"
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

      <View style={styles.editActions}>
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => setIsEditing(false)}
        />

        <Button
          title="Save"
          loading={saving}
          disabled={!content.trim()}
          onPress={async () => {
            setSaving(true);
            try {
              await save();
              setIsEditing(false);
            } finally {
              setSaving(false);
            }
          }}
        />
      </View>
    </>
  );

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <View style={styles.screen}>
      <Modal
        visible
        onClose={() => router.back()}
        title={isEditing ? 'Edit Note' : 'Note'}
        variant="fullscreen"
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          contentContainerStyle={{
            paddingBottom: (insets.bottom || 0) + 220,
          }}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator />
              <Text style={styles.muted}>Loading noteâ€¦</Text>
            </View>
          ) : !note ? (
            <Text style={styles.muted}>Note not found.</Text>
          ) : isEditing ? (
            renderEditMode()
          ) : (
            renderViewMode()
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  muted: { color: colors.text.secondary, marginTop: spacing.md },
  errorText: { color: colors.danger.main, marginBottom: spacing.sm },

  loading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },

  // ---- View mode ----
  viewTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  untitled: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  contentCard: {
    marginBottom: spacing.lg,
  },
  viewContent: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 24,
  },
  viewSection: {
    marginBottom: spacing.md,
  },
  viewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  viewSectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  viewActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  viewActionButton: {
    flex: 1,
  },

  // ---- Edit mode ----
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  editActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingBottom: 10,
  },
});