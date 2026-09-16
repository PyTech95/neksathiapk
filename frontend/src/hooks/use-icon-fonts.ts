import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

// Bundle the actual fonts: icons and first launch never depend on a CDN.
export const useIconFonts = () => useFonts({ ...Feather.font, ...MaterialCommunityIcons.font });