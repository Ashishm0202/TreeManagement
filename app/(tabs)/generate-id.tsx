import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { GeneratedIdQrModal } from "@/components/GeneratedIdQrModal";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ApiError, GenrateTreeID } from "@/services/api";

const MAX_QTY = 50;

export default function GenerateIdScreen() {
  const { username } = useAuth();
  const contentPadding = useTabBarClearance(40);
  const [quantity, setQuantity] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const adjustQty = (delta: number) => {
    const current = Math.max(1, Math.min(MAX_QTY, Number(quantity) || 1));
    const next = Math.max(1, Math.min(MAX_QTY, current + delta));
    setQuantity(String(next));
  };

  const handleGenerate = useCallback(async () => {
    const qty = Number(quantity);
    if (!quantity.trim() || Number.isNaN(qty) || qty < 1) {
      setError("Enter a valid quantity of at least 1.");
      setIsOffline(false);
      return;
    }
    if (qty > MAX_QTY) {
      setError(`Please generate at most ${MAX_QTY} IDs at a time.`);
      setIsOffline(false);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setIsOffline(false);
    try {
      const result = await GenrateTreeID({ qty, by: username ?? "app" });
      const ids = result.map((item) => item.TreeID).filter(Boolean);
      setGeneratedIds((prev) => [...ids, ...prev]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setIsOffline(err.isOffline);
      } else {
        setError("Couldn't generate Tree IDs. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [quantity, username]);

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <Animated.View
        entering={FadeInRight.delay(Math.min(index, 8) * 50)
          .duration(300)
          .springify()
          .damping(18)}
      >
        <Pressable style={styles.idCard} onPress={() => setSelectedId(item)}>
          <View style={styles.idIconWrap}>
            <MaterialCommunityIcons name="tag-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.idText}>{item}</Text>
          <View style={styles.qrBadge}>
            <MaterialCommunityIcons name="qrcode" size={18} color={Colors.primary} />
          </View>
        </Pressable>
      </Animated.View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]}>
          <Animated.View entering={FadeInDown.duration(450)}>
            <Text style={styles.headerTitle}>Generate Tree ID</Text>
            <Text style={styles.headerSubtitle}>
              Reserve new Tree IDs and print their QR codes
            </Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <Animated.View
        entering={FadeInDown.delay(120).duration(450)}
        style={styles.formCard}
      >
        <Text style={styles.fieldLabel}>Quantity</Text>
        <View style={styles.qtyRow}>
          <Pressable style={styles.qtyButton} onPress={() => adjustQty(-1)} hitSlop={8}>
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </Pressable>
          <TextInput
            style={styles.qtyInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            textAlign="center"
          />
          <Pressable style={styles.qtyButton} onPress={() => adjustQty(1)} hitSlop={8}>
            <Ionicons name="add" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.byRow}>
          <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.byText}>Requested by {username ?? "you"}</Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, isOffline && styles.offlineBox]}>
            <Ionicons
              name={isOffline ? "cloud-offline-outline" : "alert-circle-outline"}
              size={16}
              color={isOffline ? "#8A5A0A" : Colors.danger}
            />
            <Text style={[styles.errorText, isOffline && styles.offlineText]}>{error}</Text>
          </View>
        ) : null}

        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            onPressIn={() => {
              buttonScale.value = withTiming(0.97, { duration: 100 });
            }}
            onPressOut={() => {
              buttonScale.value = withTiming(1, { duration: 150 });
            }}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="sparkles-outline" size={19} color="#FFFFFF" />
            )}
            <Text style={styles.generateButtonText}>
              {isGenerating ? "Generating..." : "Generate Tree ID"}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <FlatList
        data={generatedIds}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: contentPadding }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          generatedIds.length > 0 ? (
            <Text style={styles.listHeader}>
              {generatedIds.length} generated {generatedIds.length === 1 ? "ID" : "IDs"}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="tag-multiple-outline"
              size={44}
              color={Colors.primaryLight}
            />
            <Text style={styles.emptyTitle}>No IDs generated yet</Text>
            <Text style={styles.emptyText}>
              Choose a quantity and tap Generate to reserve new Tree IDs with
              scannable QR codes.
            </Text>
          </View>
        }
      />

      <GeneratedIdQrModal treeID={selectedId} onClose={() => setSelectedId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginTop: 8 },
  headerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: -14,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: Colors.textMuted, marginBottom: 8 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  byRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12 },
  byText: { fontSize: 12, color: Colors.textMuted },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.dangerSoft,
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  offlineBox: { backgroundColor: Colors.accentSoft },
  errorText: { color: Colors.danger, fontSize: 12.5, flex: 1, lineHeight: 17 },
  offlineText: { color: "#8A5A0A" },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 50,
    marginTop: 16,
  },
  generateButtonDisabled: { opacity: 0.7 },
  generateButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  listContent: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  listHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 10,
  },
  idCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  idIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  idText: { flex: 1, fontSize: 15, fontWeight: "700", color: Colors.text },
  qrBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 12 },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
});
