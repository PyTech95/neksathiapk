import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Field } from './Field';
import { NeonButton } from './NeonButton';
import { colors, fonts, spacing, radius } from '@/src/theme';

interface Props {
  testID: string; label: string; value: string; options: { id: string; label: string }[];
  onChange: (id: string) => void; loading?: boolean; disabled?: boolean; error?: string | null; onRetry?: () => void; inline?: boolean;
}
export function SearchSelect({ testID, label, value, options, onChange, loading, disabled, error, onRetry, inline = false }: Props) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const selected = options.find(o => o.id === value);
  return <View style={styles.wrap}>
    <Text testID={`${testID}-label`} style={styles.label}>{label}</Text>
    <Pressable testID={testID} accessibilityRole="button" disabled={disabled || loading} onPress={() => { setQuery(''); setOpen(true); }} style={styles.trigger}>
      <Text testID={`${testID}-value`} style={styles.text}>{selected?.label || value || `Select ${label.toLowerCase()}`}</Text>
      {loading ? <ActivityIndicator color={colors.teal} /> : <Feather name="chevron-down" size={20} color={colors.textDim} />}
    </Pressable>
    {inline && open ? <View testID={`${testID}-inline`} style={styles.inline}>
      <Field testID={`${testID}-search`} placeholder={`Search ${label.toLowerCase()}`} value={query} onChangeText={setQuery} autoCorrect={false} icon="search" />
      {options.filter(o => o.label.toLowerCase().includes(query.toLowerCase().trim())).map(item => <Pressable testID={`${testID}-option-${item.id}`} key={item.id} accessibilityRole="button" onPress={() => { onChange(item.id); setOpen(false); }} style={styles.option}>
        <Text style={styles.text}>{item.label}</Text>{item.id === value ? <Feather name="check" size={20} color={colors.teal} /> : null}
      </Pressable>)}
      {!options.some(o => o.label.toLowerCase().includes(query.toLowerCase().trim())) && <Text testID={`${testID}-empty`} style={styles.label}>No data found</Text>}
      <NeonButton testID={`${testID}-close`} label="Close options" variant="ghost" onPress={() => setOpen(false)} />
    </View> : null}
    {!inline && <Modal testID={`${testID}-modal`} visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.modal}><Text style={styles.title} testID={`${testID}-title`}>{label}</Text>
        <Field testID={`${testID}-search`} placeholder={`Search ${label.toLowerCase()}`} value={query} onChangeText={setQuery} autoCorrect={false} icon="search" />
        {error ? <><Text testID={`${testID}-error`} style={styles.error}>{error}</Text><NeonButton testID={`${testID}-retry`} label="Retry" onPress={() => onRetry?.()} /></> : null}
        <FlatList data={options.filter(o => o.label.toLowerCase().includes(query.toLowerCase().trim()))} keyboardShouldPersistTaps="handled" keyExtractor={o => o.id}
          ListEmptyComponent={<Text testID={`${testID}-empty`} style={styles.label}>No data found</Text>}
          renderItem={({ item }) => <Pressable testID={`${testID}-option-${item.id}`} accessibilityRole="button" onPress={() => { onChange(item.id); setOpen(false); }} style={styles.option}>
            <Text style={styles.text}>{item.label}</Text>{item.id === value ? <Feather name="check" size={20} color={colors.teal} /> : null}
          </Pressable>} />
        <NeonButton testID={`${testID}-close`} label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
      </SafeAreaView>
    </Modal>}
  </View>;
}
const styles = StyleSheet.create({
  wrap: { gap: spacing.sm }, label: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  inline: { gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  text: { flex: 1, fontFamily: fonts.body, color: colors.text, fontSize: 16 },
  modal: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.lg },
  title: { fontFamily: fonts.displaySemi, color: colors.text, fontSize: 24 }, error: { color: colors.red, fontSize: 14 },
  option: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, paddingVertical: spacing.md },
});