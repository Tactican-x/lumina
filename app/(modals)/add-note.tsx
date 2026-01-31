import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { Input, TextArea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';
import { useNotes } from '@/hooks';

export default function AddNoteModal() {
  const { create } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);

  const tags = tagsText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Add Note" variant="fullscreen">
        <Input label="Title (optional)" value={title} onChangeText={setTitle} placeholder="e.g., Breakthrough idea" />
        <TextArea label="Content" value={content} onChangeText={setContent} placeholder="Write your note…" />
        <Input label="Tags (comma separated)" value={tagsText} onChangeText={setTagsText} placeholder="e.g., sleep, focus" />

        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: spacing.md }}>
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button
            title="Save"
            loading={saving}
            disabled={!content.trim()}
            onPress={async () => {
              setSaving(true);
              await create({
                title: title.trim() || undefined,
                content: content.trim(),
                tags,
              });
              setSaving(false);
              router.back();
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
});