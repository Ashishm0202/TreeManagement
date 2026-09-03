import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { LoginSuccessModal } from "@/components/LoginSuccessModal";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const PARTICLES = [
  { left: "12%", size: 16, delay: 0, duration: 5200, drift: -18 },
  { left: "78%", size: 12, delay: 900, duration: 4600, drift: 14 },
  { left: "38%", size: 10, delay: 1700, duration: 5800, drift: -10 },
  { left: "60%", size: 14, delay: 2500, duration: 5000, drift: 20 },
] as const;

function LeafParticle({
  left,
  size,
  delay,
  duration,
  drift,
}: (typeof PARTICLES)[number]) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      )
    );
  }, [progress, delay, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 0.85, 1], [0, 0.5, 0.5, 0]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [40, -220]) },
      { translateX: interpolate(progress.value, [0, 1], [0, drift]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, 50])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, { left }, style]}>
      <Ionicons name="leaf" size={size} color="rgba(255,255,255,0.7)" />
    </Animated.View>
  );
}

interface AnimatedFieldProps {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  rightSlot?: React.ReactNode;
}

function AnimatedField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  rightSlot,
}: AnimatedFieldProps) {
  const focus = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [Colors.border, Colors.primary]
    ),
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [Colors.background, "#FFFFFF"]
    ),
    transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.015]) }],
  }));

  const iconWrapStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [Colors.surface, Colors.primarySoft]
    ),
  }));

  return (
    <Animated.View style={[styles.inputGroup, containerStyle]}>
      <Animated.View style={[styles.inputIconWrap, iconWrapStyle]}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </Animated.View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          focus.value = withTiming(1, { duration: 200 });
        }}
        onBlur={() => {
          focus.value = withTiming(0, { duration: 200 });
        }}
      />
      {rightSlot}
    </Animated.View>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const blobA = useSharedValue(0);
  const blobB = useSharedValue(0);
  const blobC = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    blobA.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    blobB.value = withRepeat(
      withTiming(1, { duration: 7500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    blobC.value = withRepeat(
      withTiming(1, { duration: 8800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withDelay(1800, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [blobA, blobB, blobC, shimmer]);

  useEffect(() => {
    if (!error) return;
    shakeX.value = withSequence(
      withTiming(-8, { duration: 55 }),
      withTiming(8, { duration: 55 }),
      withTiming(-6, { duration: 55 }),
      withTiming(6, { duration: 55 }),
      withTiming(0, { duration: 55 })
    );
  }, [error, shakeX]);

  const blobAStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(blobA.value, [0, 1], [0, -26]) },
      { translateX: interpolate(blobA.value, [0, 1], [0, 18]) },
    ],
  }));
  const blobBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(blobB.value, [0, 1], [0, 22]) },
      { translateX: interpolate(blobB.value, [0, 1], [0, -16]) },
    ],
  }));
  const blobCStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(blobC.value, [0, 1], [0, -16]) },
      { translateX: interpolate(blobC.value, [0, 1], [0, -22]) },
    ],
  }));
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-160, 340]) }],
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 1, 0]),
  }));

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      setIsOffline(false);
      return;
    }
    setSubmitting(true);
    setError(null);
    setIsOffline(false);

    const outcome = await login(username, password);
    setSubmitting(false);

    if (outcome.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.replace("/");
      }, 1100);
    } else {
      setError(outcome.message);
      setIsOffline(outcome.isOffline);
    }
  };

  return (
    <LinearGradient
      colors={["#083D24", Colors.gradientStart, Colors.gradientEnd, "#2E9E5B"]}
      locations={[0, 0.35, 0.7, 1]}
      style={styles.gradient}
    >
      <Animated.View style={[styles.blob, styles.blobOne, blobAStyle]} />
      <Animated.View
        style={[styles.blob, styles.blobTwo, { backgroundColor: "rgba(45,212,191,0.16)" }, blobBStyle]}
      />
      <Animated.View
        style={[styles.blob, styles.blobThree, { backgroundColor: "rgba(251,191,36,0.14)" }, blobCStyle]}
      />

      {PARTICLES.map((particle, index) => (
        <LeafParticle key={index} {...particle} />
      ))}

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          // Android gets "height": with edge-to-edge enabled the window is no
          // longer resized for us, so the view has to give up the space itself.
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.brandWrap}>
              <Animated.View
                entering={ZoomIn.duration(700).springify().damping(12)}
                style={styles.logoCircle}
              >
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={styles.logoGradient}
                >
                  <Ionicons name="leaf" size={34} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
              <Animated.Text
                entering={FadeInDown.delay(150).duration(500)}
                style={styles.brandTitle}
              >
                Tree Management
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.delay(230).duration(500)}
                style={styles.brandSubtitle}
              >
                Track, protect &amp; nurture every tree
              </Animated.Text>
            </View>

            <Animated.View
              entering={FadeInUp.delay(280).duration(650).springify().damping(16)}
              style={styles.card}
            >
              <View style={styles.cardAccent} />
              <Text style={styles.cardTitle}>Welcome back 👋</Text>
              <Text style={styles.cardSubtitle}>
                Sign in to continue to your dashboard
              </Text>

              <AnimatedField
                icon="person-outline"
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
              />

              <AnimatedField
                icon="lock-closed-outline"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightSlot={
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={19}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                }
              />

              <Pressable
                style={styles.forgotLink}
                onPress={() =>
                  Alert.alert(
                    "Forgot password?",
                    "Please contact your administrator to reset your password."
                  )
                }
                hitSlop={8}
              >
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </Pressable>

              {error ? (
                <Animated.View
                  style={[styles.errorBox, isOffline && styles.offlineBox, shakeStyle]}
                >
                  <Ionicons
                    name={isOffline ? "cloud-offline-outline" : "alert-circle-outline"}
                    size={16}
                    color={isOffline ? Colors.accent : Colors.danger}
                  />
                  <Text
                    style={[styles.errorText, isOffline && styles.offlineText]}
                  >
                    {error}
                  </Text>
                </Animated.View>
              ) : null}

              <Animated.View style={buttonAnimatedStyle}>
                <Pressable
                  style={styles.loginButton}
                  onPress={handleLogin}
                  onPressIn={() => {
                    buttonScale.value = withTiming(0.96, { duration: 100 });
                  }}
                  onPressOut={() => {
                    buttonScale.value = withTiming(1, { duration: 150 });
                  }}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonGradient}
                  >
                    <Animated.View style={[styles.shimmer, shimmerStyle]} />
                    <Text style={styles.loginButtonText}>
                      {submitting ? "Signing in..." : "Sign In"}
                    </Text>
                    {!submitting && (
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              <View style={styles.secureRow}>
                <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.secureText}>Secured sign-in</Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <LoginSuccessModal visible={showSuccess} username={username.trim()} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  // Centred while it fits, scrollable once the keyboard squeezes it.
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  blobOne: { width: 220, height: 220, top: -60, right: -50 },
  blobTwo: { width: 260, height: 260, bottom: -80, left: -70 },
  blobThree: { width: 180, height: 180, top: "38%", right: -60 },
  particle: { position: "absolute", bottom: 0 },
  brandWrap: { alignItems: "center", marginBottom: 30 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoGradient: {
    flex: 1,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  brandSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 24,
    paddingTop: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: Colors.primary,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 22,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 8,
    height: 56,
    marginBottom: 14,
    backgroundColor: Colors.background,
    gap: 10,
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    height: "100%",
  },
  forgotLink: { alignSelf: "flex-end", marginBottom: 16, marginTop: -4 },
  forgotLinkText: { fontSize: 12.5, fontWeight: "700", color: Colors.primary },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.dangerSoft,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  offlineBox: { backgroundColor: Colors.accentSoft },
  errorText: {
    color: Colors.danger,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 17,
  },
  offlineText: { color: "#8A5A0A" },
  loginButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 2,
  },
  loginButtonGradient: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: -20,
    bottom: -20,
    width: 70,
    backgroundColor: "rgba(255,255,255,0.35)",
    transform: [{ rotate: "20deg" }],
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 16,
  },
  secureText: { fontSize: 11.5, color: Colors.textMuted },
});
