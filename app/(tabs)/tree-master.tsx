import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { QRCodeModal } from "@/components/QRCodeModal";
import { QRScannerModal } from "@/components/QRScannerModal";
import { TreeCard } from "@/components/TreeCard";
import { TreeFormModal } from "@/components/TreeFormModal";
import { TreeSuccessModal } from "@/components/TreeSuccessModal";
import { Colors } from "@/constants/colors";
import { useTrees } from "@/contexts/TreeContext";
import { ApiError, GetTreeID } from "@/services/api";
import type { Tree, TreeFormValues } from "@/types/tree";

export default function TreeMasterScreen() {
  const {
    trees,
    isLoading,
    isRefreshing,
    error,
    isOffline,
    refresh,
    addTree,
    updateTree,
    deleteTree,
    revertTree,
  } = useTrees();
  const [formVisible, setFormVisible] = useState(false);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [claimedTree, setClaimedTree] = useState<Tree | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isLookingUpId, setIsLookingUpId] = useState(false);
  const [qrTree, setQrTree] = useState<Tree | null>(null);
  const [deletingTree, setDeletingTree] = useState<Tree | null>(null);
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ name: string; mode: "add" | "edit" } | null>(
    null
  );
  const fabScale = useSharedValue(1);
  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const filteredTrees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return trees;
    return trees.filter((tree) => tree.TreeName.toLowerCase().includes(normalized));
  }, [trees, query]);

  const openScanner = useCallback(() => {
    setActionError(null);
    setScannerVisible(true);
  }, []);

  const closeScanner = useCallback(() => setScannerVisible(false), []);

  const handleScanned = useCallback(async (scannedId: string) => {
    setScannerVisible(false);
    setIsLookingUpId(true);
    setActionError(null);
    try {
      const tree = await GetTreeID(scannedId);
      setClaimedTree(tree);
      setEditingTree(null);
      setSubmitError(null);
      setFormVisible(true);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : `Couldn't find Tree ID "${scannedId}". Please try again.`
      );
    } finally {
      setIsLookingUpId(false);
    }
  }, []);

  const openEditForm = useCallback((tree: Tree) => {
    setEditingTree(tree);
    setClaimedTree(null);
    setSubmitError(null);
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setClaimedTree(null);
  }, []);

  const handleSubmit = useCallback(
    async (input: TreeFormValues) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        if (editingTree) {
          await updateTree(editingTree, input);
        } else if (claimedTree) {
          await updateTree(claimedTree, input);
        } else {
          await addTree(input);
        }
        setFormVisible(false);
        setClaimedTree(null);
        setSuccessInfo({ name: input.TreeName, mode: editingTree ? "edit" : "add" });
        setTimeout(() => setSuccessInfo(null), 1600);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Couldn't save this tree. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingTree, claimedTree, addTree, updateTree]
  );

  const handleDelete = useCallback((tree: Tree) => {
    setDeleteError(null);
    setDeletingTree(tree);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingTree) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTree(deletingTree);
      setDeletingTree(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Couldn't delete this tree. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  }, [deletingTree, deleteTree]);

  const cancelDelete = useCallback(() => setDeletingTree(null), []);
  const closeQr = useCallback(() => setQrTree(null), []);

  const handleRevert = useCallback(
    async (tree: Tree) => {
      setActionError(null);
      setRevertingId(tree.ID);
      try {
        await revertTree(tree);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Couldn't revert this tree. Please try again."
        );
      } finally {
        setRevertingId(null);
      }
    },
    [revertTree]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Tree; index: number }) => (
      <Animated.View
        entering={FadeInRight.delay(Math.min(index, 8) * 60)
          .duration(320)
          .springify()
          .damping(18)}
      >
        <TreeCard
          tree={item}
          onEdit={openEditForm}
          onDelete={handleDelete}
          onShowQr={setQrTree}
          onRevert={handleRevert}
          isReverting={item.ID === revertingId}
        />
      </Animated.View>
    ),
    [openEditForm, handleDelete, handleRevert, revertingId]
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]}>
          <Animated.View entering={FadeInDown.duration(450)}>
            <Text style={styles.headerTitle}>Tree Master</Text>
            <Text style={styles.headerSubtitle}>
              {trees.length} {trees.length === 1 ? "tree" : "trees"} registered
            </Text>
          </Animated.View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.85)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trees by name..."
              placeholderTextColor="rgba(255,255,255,0.65)"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.85)" />
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {error ? (
        <View style={[styles.banner, isOffline && styles.bannerOffline]}>
          <Ionicons
            name={isOffline ? "cloud-offline-outline" : "alert-circle-outline"}
            size={16}
            color={isOffline ? "#8A5A0A" : Colors.danger}
          />
          <Text style={[styles.bannerText, isOffline && styles.bannerTextOffline]}>
            {isOffline ? "You're offline. Showing last saved data." : error}
          </Text>
          <Pressable onPress={refresh} hitSlop={8}>
            <Ionicons
              name="refresh"
              size={16}
              color={isOffline ? "#8A5A0A" : Colors.danger}
            />
          </Pressable>
        </View>
      ) : actionError ? (
        <View style={styles.banner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
          <Text style={styles.bannerText}>{actionError}</Text>
          <Pressable onPress={() => setActionError(null)} hitSlop={8}>
            <Ionicons name="close" size={16} color={Colors.danger} />
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading trees...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTrees}
          keyExtractor={(item) => item.ID}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={9}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name={query ? "file-search-outline" : "tree-outline"}
                size={48}
                color={Colors.primaryLight}
              />
              <Text style={styles.emptyTitle}>
                {query ? "No matching trees" : "No trees yet"}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? `Nothing matches "${query}". Try a different name.`
                  : "Tap the scan button to claim a Tree ID and register your first tree."}
              </Text>
            </View>
          }
        />
      )}

      <Animated.View
        entering={ZoomIn.delay(300).duration(400).springify().damping(12)}
        style={styles.fabWrap}
      >
        <Animated.View style={fabAnimatedStyle}>
          <Pressable
            style={styles.fab}
            onPress={openScanner}
            onPressIn={() => {
              fabScale.value = withTiming(0.9, { duration: 100 });
            }}
            onPressOut={() => {
              fabScale.value = withTiming(1, { duration: 150 });
            }}
          >
            <Ionicons name="qr-code-outline" size={26} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </Animated.View>

      {isLookingUpId ? (
        <View style={styles.lookupOverlay}>
          <View style={styles.lookupCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.lookupText}>Looking up Tree ID...</Text>
          </View>
        </View>
      ) : null}

      <QRScannerModal
        visible={scannerVisible}
        onClose={closeScanner}
        onScanned={handleScanned}
      />

      <TreeFormModal
        key={editingTree?.ID ?? claimedTree?.ID ?? "new"}
        visible={formVisible}
        editingTree={editingTree}
        claimedTree={claimedTree}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <QRCodeModal tree={qrTree} onClose={closeQr} />

      <ConfirmDeleteModal
        tree={deletingTree}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

      <TreeSuccessModal
        visible={!!successInfo}
        treeName={successInfo?.name ?? ""}
        mode={successInfo?.mode ?? "add"}
      />
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14, height: "100%" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dangerSoft,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bannerOffline: { backgroundColor: Colors.accentSoft },
  bannerText: { flex: 1, fontSize: 12.5, color: Colors.danger, lineHeight: 17 },
  bannerTextOffline: { color: "#8A5A0A" },
  listContent: { padding: 20, paddingBottom: 100, flexGrow: 1 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  fabWrap: {
    position: "absolute",
    right: 22,
    bottom: 28,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  lookupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 30, 20, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  lookupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 12,
  },
  lookupText: { fontSize: 13, fontWeight: "600", color: Colors.text },
});
