import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/colors";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { useAuth } from "@/contexts/AuthContext";
import { useTrees } from "@/contexts/TreeContext";

const BENEFITS = [
  {
    icon: "cloud-outline" as const,
    title: "Clean Air",
    text: "Trees absorb carbon dioxide and release the oxygen every living being depends on.",
  },
  {
    icon: "water-outline" as const,
    title: "Water Cycle",
    text: "Roots hold soil and regulate groundwater, preventing erosion and drought.",
  },
  {
    icon: "paw-outline" as const,
    title: "Habitat",
    text: "Millions of species rely on trees for shelter, food, and survival.",
  },
  {
    icon: "thermometer-outline" as const,
    title: "Climate Balance",
    text: "Tree cover cools the environment and softens the impact of climate change.",
  },
];

export default function HomeScreen() {
  const { username, logout } = useAuth();
  const { trees } = useTrees();
  const contentPadding = useTabBarClearance(40);
  const ctaScale = useSharedValue(1);
  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]}>
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={styles.headerRow}
          >
            <View>
              <Text style={styles.greeting}>Hello, {username ?? "there"}</Text>
              <Text style={styles.headerTitle}>Tree Management</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push("/tree-map")}
                style={styles.headerIconButton}
                hitSlop={10}
              >
                <Ionicons name="map-outline" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={handleLogout}
                style={styles.headerIconButton}
                hitSlop={10}
              >
                <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(120).duration(500).springify().damping(16)}
            style={styles.statCard}
          >
            <MaterialCommunityIcons
              name="tree-outline"
              size={30}
              color={Colors.primary}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.statValue}>{trees.length}</Text>
              <Text style={styles.statLabel}>Trees registered</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: contentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(180).duration(500)}>
          <Text style={styles.sectionTitle}>Why Trees Matter</Text>
          <Text style={styles.paragraph}>
            Trees are the quiet backbone of life on Earth. They produce the
            oxygen we breathe, filter pollutants from the air, and provide
            food and shelter to countless species — including us. Protecting
            existing trees and planting new ones is one of the simplest, most
            powerful actions we can take for a healthier planet.
          </Text>
        </Animated.View>

        <View style={styles.benefitsGrid}>
          {BENEFITS.map((benefit, index) => (
            <Animated.View
              key={benefit.title}
              entering={FadeInUp.delay(260 + index * 90)
                .duration(450)
                .springify()
                .damping(18)}
              style={styles.benefitCard}
            >
              <View style={styles.benefitIconWrap}>
                <Ionicons name={benefit.icon} size={22} color={Colors.primary} />
              </View>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View
          entering={FadeInUp.delay(620).duration(500)}
          style={styles.infoBox}
        >
          <View style={styles.infoBoxHeader}>
            <Ionicons name="location-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoBoxTitle}>Every Tree Has a Place</Text>
          </View>
          <Text style={styles.paragraph}>
            In this project, every tree you register is tied to its own
            unique geographic location — a precise latitude and longitude —
            along with a name, description and detailed notes. This makes it
            possible to track exactly where each tree stands, monitor it over
            time, and generate a scannable QR code that instantly reveals its
            identity and coordinates in the field.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(700).duration(500)}>
          <Animated.View style={ctaAnimatedStyle}>
            <Pressable
              style={styles.ctaButton}
              onPress={() => router.push("/tree-master")}
              onPressIn={() => {
                ctaScale.value = withTiming(0.96, { duration: 100 });
              }}
              onPressOut={() => {
                ctaScale.value = withTiming(1, { duration: 150 });
              }}
            >
              <MaterialCommunityIcons name="qrcode" size={20} color="#FFFFFF" />
              <Text style={styles.ctaButtonText}>Go to Tree Master</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  greeting: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 2,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  statValue: { fontSize: 22, fontWeight: "700", color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textMuted,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  benefitCard: {
    width: "48%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  benefitTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  benefitText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  infoBox: {
    backgroundColor: "#EAF6EC",
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoBoxTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 50,
    marginTop: 24,
  },
  ctaButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
