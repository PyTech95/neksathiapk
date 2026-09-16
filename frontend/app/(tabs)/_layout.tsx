import { Tabs } from "expo-router";

import { TabBar } from "@/src/components/TabBar";
import { colors } from "@/src/theme";
import { useAuth } from '@/src/context/AuthContext';
import { StartupState } from '@/src/components/StartupState';

// Land on Security (Smart QR) when the app opens — adding/finding vehicles &
// tags is the primary flow; SOS stays one tap away on the Home tab.
export const unstable_settings = {
  initialRouteName: "security",
};

export default function TabsLayout() {
  const { user, bootstrapping, startupError, retryStartup } = useAuth();
  if (bootstrapping || startupError) return <StartupState error={startupError} onRetry={retryStartup} />;
  if (!user) return null;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="security" options={{ title: "Security" }} />
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="family" options={{ title: "Family" }} />
      <Tabs.Screen name="safety" options={{ title: "Safety" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
