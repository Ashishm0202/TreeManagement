import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { Colors } from "@/constants/colors";
import { getTreeDesignUrl } from "@/services/api";

function resolveDesignUrl(scanned: string) {
  const trimmed = scanned.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return getTreeDesignUrl(trimmed);
}

export default function ScanScreen() {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualId, setManualId] = useState("");
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageError, setPageError] = useState(false);
  const hasScannedRef = useRef(false);
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!pageUrl) hasScannedRef.current = false;
  }, [pageUrl]);

  const openUrl = (scanned: string) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    setPageError(false);
    setPageUrl(resolveDesignUrl(scanned));
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!data.trim()) return;
    openUrl(data);
  };

  const handleManualSubmit = () => {
    if (!manualId.trim()) return;
    openUrl(manualId);
    setManualId("");
  };

  const scanAgain = () => {
    setPageUrl(null);
    setPageError(false);
  };

  if (pageUrl) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top"]} style={styles.webHeader}>
          <Pressable style={styles.backButton} onPress={scanAgain} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
            <Text style={styles.backButtonText}>Scan Again</Text>
          </Pressable>
        </SafeAreaView>

        <WebView
          ref={webviewRef}
          source={{ uri: pageUrl }}
          style={styles.webview}
          startInLoadingState
          onLoadStart={() => setIsPageLoading(true)}
          onLoadEnd={() => setIsPageLoading(false)}
          onError={() => {
            setIsPageLoading(false);
            setPageError(true);
          }}
        />

        {isPageLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : null}

        {pageError ? (
          <View style={styles.loadingOverlay}>
            <Ionicons name="alert-circle-outline" size={40} color={Colors.danger} />
            <Text style={styles.errorText}>Couldn&apos;t load this page.</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setPageError(false);
                setIsPageLoading(true);
                webviewRef.current?.reload();
              }}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permission?.granted && isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : permission?.granted ? (
        <View style={StyleSheet.absoluteFillObject} />
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

      <SafeAreaView style={styles.overlay} edges={["top"]}>
        {permission?.granted ? (
          <View style={styles.scanCenter}>
            <Text style={styles.title}>Scan Tree QR Code</Text>
            <View style={styles.scanFrame} />
            <Text style={styles.hint}>Align the QR code within the frame</Text>
          </View>
        ) : null}

        <View style={styles.manualCard}>
          <Text style={styles.manualLabel}>Or enter Tree ID / link manually</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="e.g. TR0005"
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
      </SafeAreaView>
    </View>
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
  overlay: { flex: 1, justifyContent: "space-between" },
  scanCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
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
    marginHorizontal: 24,
    marginBottom: 34,
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
  webHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  backButtonText: { fontSize: 13, fontWeight: "700", color: Colors.text },
  webview: { flex: 1, backgroundColor: Colors.surface },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 60,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: { fontSize: 14, color: Colors.text, fontWeight: "600" },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 42,
  },
  retryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
