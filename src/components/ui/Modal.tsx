import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { X } from '@/components/ui/Lucide';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type ModalVariant = 'bottom-sheet' | 'center' | 'fullscreen';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  variant?: ModalVariant;
  showCloseButton?: boolean;
  children: React.ReactNode;
  closeOnBackdropPress?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  variant = 'bottom-sheet',
  showCloseButton = true,
  closeOnBackdropPress = true,
  children,
}: ModalProps) {
  const insets = useSafeAreaInsets();

  // IMPORTANT: standalone Android builds often report insets.bottom as 0 even with nav bar present
  const bottomInset =
    Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });

      if (variant === 'bottom-sheet') {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      } else {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      }
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible, variant]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const contentStyle = useAnimatedStyle(() => {
    if (variant === 'bottom-sheet') {
      return { transform: [{ translateY: translateY.value }] };
    }
    return { transform: [{ scale: scale.value }], opacity: opacity.value };
  });

  const headerStyle = [
    styles.header,
    variant === 'fullscreen' && { paddingTop: spacing.md + insets.top },
  ];

  const bodyStyle = [
    styles.body,
    (variant === 'fullscreen' || variant === 'bottom-sheet') && { flex: 1 },
    (variant === 'fullscreen' || variant === 'bottom-sheet') && {
      paddingBottom: spacing.md + bottomInset,
    },
  ];

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={closeOnBackdropPress ? onClose : undefined}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.content,
            variant === 'bottom-sheet' && styles.bottomSheet,
            variant === 'center' && styles.center,
            variant === 'fullscreen' && styles.fullscreen,
            contentStyle,
          ]}
        >
          {(title || showCloseButton) && (
            <View style={headerStyle}>
              {variant === 'bottom-sheet' && <View style={styles.handle} />}

              <View style={styles.headerContent}>
                {title ? <Text style={styles.title}>{title}</Text> : <View />}

                {showCloseButton && (
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={22} color={colors.text.secondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={bodyStyle}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)' },

  content: { backgroundColor: colors.background.secondary, overflow: 'hidden' },

  bottomSheet: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    height: SCREEN_HEIGHT * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },

  center: {
    position: 'absolute',
    top: '50%',
    left: spacing.lg,
    right: spacing.lg,
    transform: [{ translateY: -100 }],
    borderRadius: borderRadius.xl,
  },

  fullscreen: { flex: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0 },

  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.medium,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },

  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    flex: 1,
  },

  closeButton: { padding: spacing.xs },

  body: { padding: spacing.md },
});