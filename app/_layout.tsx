import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TreeProvider } from "@/contexts/TreeContext";

// Called in global scope, without awaiting, as the docs require — inside a
// component this can run after the splash has already auto-hidden.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 300 });

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

function AppShell() {
  const { isLoading } = useAuth();
  const [hasIntroPlayed, setHasIntroPlayed] = useState(false);

  // The growth animation doubles as cover for the stored-session check, so the
  // app is only revealed once the tree has finished growing *and* auth has
  // resolved — never to an empty frame.
  const isReady = hasIntroPlayed && !isLoading;

  return (
    <>
      <StatusBar style={isReady ? "light" : "dark"} />
      <RootNavigator />
      {isReady ? null : <AnimatedSplash onFinish={() => setHasIntroPlayed(true)} />}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TreeProvider>
        <AppShell />
      </TreeProvider>
    </AuthProvider>
  );
}
