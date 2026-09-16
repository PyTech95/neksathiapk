import { StyleSheet, Text, View } from 'react-native';
import type { Tag } from '@/src/api/types';
import { activeTag } from '@/src/utils/vehicles';
import { colors, spacing } from '@/src/theme';

export function TagChips({ tags, testID }: { tags: Tag[]; testID: string }) {
  return <View testID={testID} style={styles.row}>{tags.filter(activeTag).map(tag => {
    const color = typeof tag.color === 'string' && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(tag.color) ? tag.color : colors.teal;
    return <View testID={`${testID}-${tag.id}`} key={tag.id} style={[styles.chip, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>{typeof tag.name === 'string' ? tag.name : 'Tag'}{tag.status ? ` · ${tag.status}` : ''}</Text>
    </View>;
  })}</View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%', gap: 6, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 }, text: { color: colors.textMuted, fontSize: 13, flexShrink: 1 },
});