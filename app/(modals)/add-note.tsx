import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Modal } from '@/components/ui/Modal';
import { Input, TextArea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';
import { useNotes } from '@/hooks';

export default function AddNoteModal() {
  const insets = useSafeAreaInsets();

  const { create } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);

  const tags = useMemo(
    () =>
      tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsText]
  );

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Add Note" variant="fullscreen">
        <ScrollView
          style={{ flex: 1 }}
          // KEY FIX: big bottom padding so content can scroll above Android nav bar
          contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 180 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
        >
          <Input
            label="Title (optional)"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Breakthrough idea"
          />

          <TextArea
            label="Content"
            value={content}
            onChangeText={setContent}
            placeholder="Write your note…"
          />

          <Input
            label="Tags (comma separated)"
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="e.g., sleep, focus"
          />

          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              justifyContent: 'flex-end',
              marginTop: spacing.md,
            }}
          >
            <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
            <Button
              title="Save"
              loading={saving}
              disabled={!content.trim()}
              onPress={async () => {
                setSaving(true);
                try {
                  await create({
                    title: title.trim() || undefined,
                    content: content.trim(),
                    tags,
                  });
                  router.back();
                } finally {
                  setSaving(false);
                }
              }}
            />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
});