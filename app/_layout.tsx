import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AnimatedSplash, SPLASH_REVEAL_DURATION } from "@/components/AnimatedSplash";
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
  const reveal = useSharedValue(0);

  // The growth animation doubles as cover for the stored-session check, so the
  // app is only revealed once the tree has finished growing *and* auth has
  // resolved — never to an empty frame.
  const isReady = hasIntroPlayed && !isLoading;

  // Driven by the splash: the app scales down out of the canopy the camera is
  // diving into, so the two halves of the transition share one motion.
  const appStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 0.4], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(reveal.value, [0, 1], [1.35, 1], Extrapolation.CLAMP) },
    ],
  }));

  const handleReveal = useCallback(() => {
    reveal.value = withTiming(1, {
      duration: SPLASH_REVEAL_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [reveal]);

  // Safety net: whatever else happens, the app is never left invisible once the
  // splash has gone.
  useEffect(() => {
    if (hasIntroPlayed && reveal.value < 1) {
      reveal.value = withTiming(1, { duration: 200 });
    }
  }, [hasIntroPlayed, reveal]);

  return (
    <>
      <StatusBar style={isReady ? "light" : "dark"} />
      <Animated.View style={[styles.app, appStyle]}>
        <RootNavigator />
      </Animated.View>
      {hasIntroPlayed ? null : (
        <AnimatedSplash
          canReveal={!isLoading}
          onReveal={handleReveal}
          onFinish={() => setHasIntroPlayed(true)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <TreeProvider>
        <AppShell />
      </TreeProvider>
    </AuthProvider>
  );
}
