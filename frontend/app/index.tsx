import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

export default function Index() {
  const { user, bootstrapping, startupError } = useAuth();
  if (bootstrapping || startupError) return null; // Root gate owns loading/error independently of the active route.
  return <Redirect href={user ? '/(tabs)/security' : '/(auth)/login'} />;
}