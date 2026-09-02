import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (treeId: string) => void;
}

export function QRScannerModal({ visible, onClose, onScanned }: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualId, setManualId] = useState("");
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      hasScannedRef.current = false;
      setManualId("");
    }
  }, [visible]);

  if (!visible) return null;

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScannedRef.current || !data.trim()) return;
    hasScannedRef.current = true;
    onScanned(data.trim());
  };

  const handleManualSubmit = () => {
    if (!manualId.trim()) return;
    onScanned(manualId.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={styles.permissionState}>
            <Ionicons name="camera-outline" size={48} color="#FFFFFF" />
            <Text style={styles.permissionText}>
              Camera access is needed to scan a tree&apos;s QR code.
            </Text>
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          {permission?.granted ? (
            <>
              <Text style={styles.title}>Scan Tree ID QR Code</Text>
              <View style={styles.scanFrame} />
              <Text style={styles.hint}>Align the QR code within the frame</Text>
            </>
          ) : null}

          <View style={styles.manualCard}>
            <Text style={styles.manualLabel}>Or enter Tree ID manually</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="e.g. TR0006"
                placeholderTextColor="rgba(255,255,255,0.55)"
                autoCapitalize="characters"
                autoCorrect={false}
                value={manualId}
                onChangeText={setManualId}
                onSubmitEditing={handleManualSubmit}
                returnKeyType="go"
              />
              <Pressable style={styles.manualButton} onPress={handleManualSubmit} hitSlop={8}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  permissionState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 14,
  },
  permissionText: { color: "#FFFFFF", textAlign: "center", fontSize: 14, lineHeight: 20 },
  permissionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  closeButton: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.85)",
  },
  hint: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 18 },
  manualCard: {
    position: "absolute",
    bottom: 50,
    left: 24,
    right: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 18,
    padding: 16,
  },
  manualLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", marginBottom: 8 },
  manualRow: { flexDirection: "row", gap: 10 },
  manualInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    color: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 14,
  },
  manualButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
