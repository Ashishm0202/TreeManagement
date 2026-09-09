import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import type { Point } from "react-native-maps";

import { Colors } from "@/constants/colors";
import type { GetTree } from "@/types/tree";
import { formatDateLabel } from "@/utils/date";

interface TreeMapTooltipProps {
  tree: GetTree | null;
  /** Marker's on-screen position (from `pointForCoordinate`), or null while it's being resolved. */
  anchor: Point | null;
  /** Height of the header overlay, so the card never renders underneath it. */
  topInset: number;
  onClose: () => void;
}

const CARD_WIDTH = 240;
const ESTIMATED_HEIGHT = 200;
const EDGE_MARGIN = 12;
const MARKER_GAP = 16;
const ARROW_SIZE = 8;

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.chip}>
      <View style={styles.chipIconWrap}>
        <Ionicons name={icon} size={13} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={styles.chipValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function TreeMapTooltipComponent({ tree, anchor, topInset, onClose }: TreeMapTooltipProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  if (!tree || !anchor) return null;

  const dobLabel = formatDateLabel(tree.Dob);
  const cardWidth = size?.width ?? CARD_WIDTH;
  const cardHeight = size?.height ?? ESTIMATED_HEIGHT;

  const fitsRight = anchor.x + MARKER_GAP + cardWidth + EDGE_MARGIN <= screenWidth;
  const fitsLeft = anchor.x - MARKER_GAP - cardWidth - EDGE_MARGIN >= 0;
  const placeLeft = !fitsRight && fitsLeft;

  const left = placeLeft
    ? anchor.x - MARKER_GAP - cardWidth
    : fitsRight
      ? anchor.x + MARKER_GAP
      : Math.min(Math.max(anchor.x - cardWidth / 2, EDGE_MARGIN), screenWidth - cardWidth - EDGE_MARGIN);

  const minTop = topInset + EDGE_MARGIN;
  const maxTop = screenHeight - cardHeight - EDGE_MARGIN;
  const top = Math.min(Math.max(anchor.y - cardHeight / 2, minTop), Math.max(maxTop, minTop));

  const showsSideArrow = placeLeft || fitsRight;
  const arrowTop = Math.min(Math.max(anchor.y - top - ARROW_SIZE, 14), cardHeight - 14 - ARROW_SIZE);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size?.width || height !== size?.height) {
      setSize({ width, height });
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        layout={LinearTransition.duration(200)}
        onLayout={handleLayout}
        style={[styles.card, { width: CARD_WIDTH, left, top }]}
      >
        {showsSideArrow ? (
          <View
            style={[
              styles.arrow,
              placeLeft ? styles.arrowRight : styles.arrowLeft,
              { top: arrowTop },
            ]}
          />
        ) : null}

        <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.hero}>
          <View style={[styles.heroBlob, styles.heroBlobA]} />
          <MaterialCommunityIcons name="tree" size={40} color="rgba(255,255,255,0.95)" />

          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>

          {tree.TreeID ? (
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>{tree.TreeID}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {tree.TreeName ?? "Unnamed tree"}
          </Text>

          {tree.TreeDesc ? (
            <Text style={styles.description} numberOfLines={2}>
              {tree.TreeDesc}
            </Text>
          ) : null}

          <View style={styles.chipList}>
            <InfoChip
              icon="location-outline"
              label="Coordinates"
              value={`${tree.Lattitude?.toFixed(5) ?? "--"}, ${tree.Longitude?.toFixed(5) ?? "--"}`}
            />
            {dobLabel ? (
              <InfoChip icon="calendar-outline" label="Date of birth" value={dobLabel} />
            ) : null}
            {tree.Age != null ? (
              <InfoChip icon="hourglass-outline" label="Age" value={`${tree.Age} yrs`} />
            ) : null}
            {tree.Radius != null && tree.Radius > 0 ? (
              <InfoChip icon="resize-outline" label="Canopy radius" value={`${tree.Radius} m`} />
            ) : null}
          </View>
        </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  arrow: {
    position: "absolute",
    width: ARROW_SIZE * 1.4,
    height: ARROW_SIZE * 1.4,
    backgroundColor: Colors.surface,
    transform: [{ rotate: "45deg" }],
  },
  arrowLeft: { left: -ARROW_SIZE * 0.7 },
  arrowRight: { right: -ARROW_SIZE * 0.7 },
  hero: {
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroBlob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroBlobA: { width: 120, height: 120, top: -50, right: -30 },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  idBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  idBadgeText: { color: "#FFFFFF", fontSize: 10.5, fontWeight: "700" },
  content: { padding: 14 },
  title: { fontSize: 16, fontWeight: "700", color: Colors.text },
  description: { fontSize: 12.5, color: Colors.text, marginTop: 4, lineHeight: 17 },
  chipList: { gap: 8, marginTop: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 8,
  },
  chipIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: { fontSize: 9.5, color: Colors.textMuted, fontWeight: "600" },
  chipValue: { fontSize: 12, color: Colors.text, fontWeight: "700", marginTop: 1 },
});

export const TreeMapTooltip = memo(TreeMapTooltipComponent);
