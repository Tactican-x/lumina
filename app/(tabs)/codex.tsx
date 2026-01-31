import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Input, TextArea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, Pin } from '@/components/ui/Lucide';

import { colors, spacing, typography } from '@/constants/theme';
import { useNotes } from '@/hooks';

function formatTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags as string[];
  return [];
}

export default function CodexScreen() {
  const insets = useSafeAreaInsets();
  const { notes, pinned, recent, query, setQuery, isLoading, create, togglePin, refresh } = useNotes();

  const [quickText, setQuickText] = useState('');
  const [quickTitle, setQuickTitle] = useState('');

  const onQuickSave = async () => {
    if (!quickText.trim()) return;

    await create({
      title: quickTitle.trim() || undefined,
      content: quickText.trim(),
      tags: [],
      isPinned: false,
    });

    setQuickText('');
    setQuickTitle('');
  };

  const renderNote = ({ item }: any) => {
    const tags = formatTags(item.tags);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/(modals)/note-detail', params: { id: item.id } })}
      >
        <Card variant="default" padding="md" style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {item.title || 'Untitled'}
              </Text>
              <Text style={styles.noteSnippet} numberOfLines={2}>
                {item.content}
              </Text>
            </View>

            {/* IMPORTANT: stop propagation so tapping pin doesn't open the note */}
            <TouchableOpacity
              onPress={(e: any) => {
                e?.stopPropagation?.();
                togglePin(item.id, !item.isPinned);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.pinBtn}
              activeOpacity={0.8}
            >
              <Pin size={18} color={item.isPinned ? colors.warning.main : colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.noteMeta}>
            {!!item.lifeArea && <Badge label={String(item.lifeArea)} variant="default" size="sm" />}
            {tags.slice(0, 3).map((t: string) => (
              <Badge key={t} label={t} variant="info" size="sm" />
            ))}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const ListHeader = (
    <View style={{ gap: spacing.md }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Codex</Text>
          <Text style={styles.subtitle}>Knowledge Vault</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(modals)/add-note')}
          style={styles.addBtn}
          activeOpacity={0.9}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search notes…"
        leftIcon={<Search size={18} color={colors.text.tertiary} />}
      />

      {/* Quick Capture */}
      <Card variant="default" padding="md">
        <Text style={styles.sectionTitle}>Quick Capture</Text>

        <Input
          label="Title (optional)"
          value={quickTitle}
          onChangeText={setQuickTitle}
          placeholder="e.g., What worked today"
        />

        <TextArea
          label="Note"
          value={quickText}
          onChangeText={setQuickText}
          placeholder="Write a quick thought…"
        />

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button title="Save" onPress={onQuickSave} disabled={!quickText.trim()} />
        </View>
      </Card>

      {/* Pinned */}
      {pinned.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>Pinned</Text>
          {pinned.map((p) => renderNote({ item: p }))}
        </View>
      )}

      {/* Recent header */}
      <Text style={styles.sectionTitle}>Recent</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + 110,
          gap: spacing.md,
        }}
        onRefresh={refresh}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptySubtitle}>Use Quick Capture to create your first note.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  subtitle: { marginTop: 2, color: colors.text.tertiary },

  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },

  noteCard: { marginBottom: spacing.sm },
  noteHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.text.primary },
  noteSnippet: { marginTop: 4, color: colors.text.secondary, lineHeight: 18 },

  pinBtn: { padding: 6 },
  noteMeta: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },

  empty: { paddingVertical: spacing['2xl'], alignItems: 'center' },
  emptyTitle: { color: colors.text.primary, fontWeight: typography.weights.semibold, fontSize: typography.sizes.base },
  emptySubtitle: { marginTop: 6, color: colors.text.tertiary, textAlign: 'center' },
});