import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

import { Colors } from "@/constants/colors";
import type { Tree } from "@/types/tree";

interface ConfirmDeleteModalProps {
  tree: Tree | null;
  isDeleting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  tree,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!tree) return null;

  return (
    <Modal
      visible={!!tree}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Animated.View
          entering={FadeInUp.duration(350).springify().damping(16)}
          style={styles.card}
        >
          <Animated.View
            entering={ZoomIn.delay(100).duration(400).springify().damping(10)}
            style={styles.iconRing}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="trash-outline" size={30} color="#FFFFFF" />
            </View>
          </Animated.View>

          <Text style={styles.title}>Delete this tree?</Text>
          <Text style={styles.message}>
            <Text style={styles.treeName}>{tree.TreeName}</Text> will be
            permanently removed from the tree master, along with its saved
            location and details. This can&apos;t be undone.
          </Text>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
              disabled={isDeleting}
            >
              <Text style={styles.cancelText}>Keep Tree</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="trash" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.deleteText}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 30, 20, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 26,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  iconRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#FCE4E4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.danger,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 22,
  },
  treeName: { fontWeight: "700", color: Colors.text },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    textAlign: "center",
    marginBottom: 14,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: Colors.text,
  },
  deleteButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: Colors.danger,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  deleteText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonPressed: { opacity: 0.8 },
});
