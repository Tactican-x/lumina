import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';
import { useTasks } from '@/hooks';

export default function AddTaskModal() {
  const { create } = useTasks();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Add Task" variant="fullscreen">
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g., Write proposal" />
        <Input label="Description (optional)" value={desc} onChangeText={setDesc} placeholder="Notes…" />

        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: spacing.md }}>
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button
            title="Create"
            loading={saving}
            onPress={async () => {
              setSaving(true);
              await create({
                title,
                description: desc || undefined,
                priority: 'medium',
                status: 'pending',
                type: 'other',
                energyRequired: 'medium',
                tags: [],
              } as any);
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