import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import type { GetTree } from "@/types/tree";

interface TreeCardProps {
  tree: GetTree;
  onEdit: (tree: GetTree) => void;
  onDelete: (tree: GetTree) => void;
  onShowQr: (tree: GetTree) => void;
  onRevert: (tree: GetTree) => void;
  isReverting?: boolean;
}

function TreeCardComponent({
  tree,
  onEdit,
  onDelete,
  onShowQr,
  onRevert,
  isReverting,
}: TreeCardProps) {
  const isDeleted = tree.DelFlag === 1;

  return (
    <View style={[styles.card, isDeleted && styles.cardDeleted]}>
      <View style={[styles.iconWrap, isDeleted && styles.iconWrapDeleted]}>
        <MaterialCommunityIcons
          name="tree"
          size={26}
          color={isDeleted ? Colors.textMuted : Colors.primary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, isDeleted && styles.nameDeleted]}
            numberOfLines={1}
          >
            {tree.TreeName ?? "Unnamed tree"}
          </Text>
          {tree.TreeID ? (
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText} numberOfLines={1}>
                {tree.TreeID}
              </Text>
            </View>
          ) : null}
          {isDeleted ? (
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedBadgeText}>Deleted</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.location}>
            {tree.Lattitude ?? "--"}, {tree.Longitude ?? "--"}
          </Text>
        </View>
        {tree.TreeDesc ? (
          <Text style={styles.description} numberOfLines={2}>
            {tree.TreeDesc}
          </Text>
        ) : null}
      </View>

      {isDeleted ? (
        <Pressable
          style={({ pressed }) => [
            styles.revertButton,
            pressed && styles.actionButtonPressed,
            isReverting && styles.revertButtonDisabled,
          ]}
          onPress={() => onRevert(tree)}
          disabled={isReverting}
          hitSlop={8}
        >
          {isReverting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="arrow-undo" size={15} color="#FFFFFF" />
          )}
          <Text style={styles.revertButtonText}>
            {isReverting ? "Reverting..." : "Revert"}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: Colors.primarySoft },
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => onShowQr(tree)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="qrcode" size={17} color={Colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: Colors.accentSoft },
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => onEdit(tree)}
            hitSlop={8}
          >
            <Ionicons name="pencil" size={16} color={Colors.accent} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: Colors.dangerSoft },
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => onDelete(tree)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={17} color={Colors.danger} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardDeleted: { backgroundColor: Colors.background, borderColor: Colors.border, opacity: 0.8 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconWrapDeleted: { backgroundColor: Colors.surface },
  content: { flex: 1, marginRight: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  name: { fontSize: 15, fontWeight: "700", color: Colors.text, flexShrink: 1 },
  nameDeleted: { color: Colors.textMuted, textDecorationLine: "line-through" },
  idBadge: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: 90,
  },
  idBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.textMuted },
  deletedBadge: {
    backgroundColor: Colors.dangerSoft,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deletedBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.danger },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  location: { fontSize: 12, color: Colors.textMuted },
  description: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 16 },
  actions: { justifyContent: "center", alignItems: "center", gap: 8 },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPressed: { opacity: 0.6 },
  revertButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 32,
  },
  revertButtonDisabled: { opacity: 0.7 },
  revertButtonText: { fontSize: 12.5, fontWeight: "700", color: "#FFFFFF" },
});

export const TreeCard = memo(TreeCardComponent);
