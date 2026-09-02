import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TreeProvider } from "@/contexts/TreeContext";

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TreeProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </TreeProvider>
    </AuthProvider>
  );
}
