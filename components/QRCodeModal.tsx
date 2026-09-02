import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { Easing, FadeInUp, ZoomIn } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";

import { Colors } from "@/constants/colors";
import { getTreeDesignUrl } from "@/services/api";
import type { Tree } from "@/types/tree";

interface QRCodeModalProps {
  tree: Tree | null;
  onClose: () => void;
}

export function QRCodeModal({ tree, onClose }: QRCodeModalProps) {
  const captureRefView = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  if (!tree) return null;

  const qrValue = getTreeDesignUrl(tree.TreeID);

  const handleShare = async () => {
    if (!captureRefView.current) return;
    setShareError(null);
    setIsSharing(true);
    try {
      const uri = await captureRef(captureRefView, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setShareError("Sharing isn't available on this device.");
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: `Share ${tree.TreeName} QR Code`,
        UTI: "public.png",
      });
    } catch {
      setShareError("Couldn't share the QR code. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal visible={!!tree} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          entering={FadeInUp.duration(400).springify().damping(16)}
          style={styles.card}
        >
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={Colors.textMuted} />
          </Pressable>

          <View ref={captureRefView} collapsable={false} style={styles.captureArea}>
            <View style={styles.brandRow}>
              <Ionicons name="leaf" size={14} color={Colors.primary} />
              <Text style={styles.brandText}>Tree Management</Text>
            </View>

            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="tree" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{tree.TreeName}</Text>
            {tree.TreeID ? <Text style={styles.idText}>ID: {tree.TreeID}</Text> : null}

            <Animated.View
              entering={ZoomIn.duration(1100).easing(Easing.out(Easing.cubic))}
              style={styles.qrWrap}
            >
              <QRCode
                value={qrValue}
                size={200}
                color={Colors.text}
                backgroundColor="#FFFFFF"
              />
            </Animated.View>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color={Colors.textMuted} />
              <Text style={styles.locationText}>
                {tree.Lattitude}, {tree.Longitude}
              </Text>
            </View>
          </View>

          <Text style={styles.hint}>
            Scan to open this tree&apos;s design page. The code updates
            automatically whenever the tree ID changes.
          </Text>

          {shareError ? <Text style={styles.errorText}>{shareError}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.shareButtonText}>
              {isSharing ? "Preparing..." : "Share QR Code"}
            </Text>
          </Pressable>
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
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 1,
  },
  captureArea: {
    width: "100%",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingBottom: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 12,
  },
  brandText: { fontSize: 11, fontWeight: "700", color: Colors.primary, letterSpacing: 0.3 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  idText: { fontSize: 11, color: Colors.textMuted, marginTop: 2, marginBottom: 16 },
  qrWrap: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 14,
  },
  locationText: { fontSize: 12, color: Colors.textMuted },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 17,
  },
  errorText: {
    fontSize: 11.5,
    color: Colors.danger,
    textAlign: "center",
    marginTop: 10,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 50,
    width: "100%",
    marginTop: 20,
  },
  shareButtonPressed: { opacity: 0.85 },
  shareButtonText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "700" },
});
