import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { GlassCard } from "@/src/components/GlassCard";
import { NeonButton } from "@/src/components/NeonButton";
import { colors, fonts, fontSize, spacing } from "@/src/theme";

interface Props {
  visible: boolean;
  title: string;
  color?: string;
  submitLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  testID?: string;
}

// Reusable centered form modal (used for create/add flows across the app).
export function OverlayForm({ visible, title, color = colors.cyan, submitLabel = "Save", busy, onClose, onSubmit, children, testID }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }} testID={testID}>
      <Pressable testID={`${testID}-backdrop`} style={styles.backdrop} onPress={() => { if (!busy) onClose(); }}>
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={styles.kav}>
          <Pressable testID={`${testID}-content`} onPress={(e) => e.stopPropagation()} style={styles.cardWrap}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassCard borderColor={`${color}66`} style={{ gap: spacing.md }}>
              <Text testID={`${testID}-title`} style={styles.title}>{title}</Text>
              <View style={{ gap: spacing.md }}>{children}</View>
              <NeonButton label={submitLabel} color={color} onPress={onSubmit} loading={busy} testID="overlay-submit-button" />
              <Pressable onPress={onClose} disabled={busy} style={styles.cancel} testID="overlay-cancel-button">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </GlassCard>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(3,3,8,0.75)", justifyContent: "center", padding: spacing.lg },
  kav: { width: "100%", flex: 1, justifyContent: 'center' },
  cardWrap: { width: "100%", maxHeight: '90%' },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: fontSize.xl },
  cancel: { alignItems: "center", justifyContent: 'center', minHeight: 44, paddingVertical: spacing.xs },
  cancelText: { color: colors.textDim, fontFamily: fonts.body, fontSize: fontSize.base },
});
