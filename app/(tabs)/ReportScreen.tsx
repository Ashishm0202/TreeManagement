import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInRight, FadeInUp } from "react-native-reanimated";

import { Colors } from "@/constants/colors";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { ApiError, getTreeReport } from "@/services/api";
import type { GetTree, TreeReportRow, TreeReportStatus } from "@/types/tree";

/**
 * Maps the raw API row onto the report's vocabulary. A tree row only comes
 * into existence when someone scans its Tree ID in the field, so the audit
 * columns CreatedBy / CreatedOn are surfaced as "Scan by" / "Scan on".
 */
function toReportRow(tree: GetTree): TreeReportRow {
  const { CreatedBy, CreatedOn, ...rest } = tree;
  return {
    ...rest,
    ScanBy: CreatedBy,
    ScanOn: CreatedOn,
    status:
      tree.DelFlag === 1 ? "deleted" : CreatedBy || CreatedOn ? "scanned" : "pending",
  };
}

const STATUS_META: Record<
  TreeReportStatus,
  {
    label: string;
    /** Text colour for the on-soft status badge. */
    color: string;
    soft: string;
    /** Accent colour for the stat tiles, which sit on the page background. */
    tint: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  scanned: {
    label: "Scanned",
    color: Colors.primary,
    soft: Colors.primarySoft,
    tint: Colors.primary,
    icon: "checkmark-circle",
  },
  pending: {
    label: "Not scanned",
    color: "#8A5A0A",
    soft: Colors.accentSoft,
    tint: Colors.accent,
    icon: "time-outline",
  },
  deleted: {
    label: "Deleted",
    color: Colors.danger,
    soft: Colors.dangerSoft,
    tint: Colors.danger,
    icon: "trash-outline",
  },
};

/** Left-to-right order of the tappable stat tiles. */
const STAT_ORDER: TreeReportStatus[] = ["scanned", "pending", "deleted"];

type FilterKey = "all" | TreeReportStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "scanned", label: "Scanned" },
  { key: "pending", label: "Not scanned" },
  { key: "deleted", label: "Deleted" },
];

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCoords(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return "No location captured";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function timeValue(value: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function StatTile({
  status,
  value,
  isActive,
  onPress,
}: {
  status: TreeReportStatus;
  value: number;
  isActive: boolean;
  onPress: (status: TreeReportStatus) => void;
}) {
  const meta = STATUS_META[status];

  return (
    <Pressable
      onPress={() => onPress(status)}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${meta.label}: ${value}. ${
        isActive ? "Showing only these. Tap to clear." : "Tap to filter."
      }`}
      style={({ pressed }) => [
        styles.statTile,
        isActive && { backgroundColor: meta.soft, borderColor: meta.tint },
        pressed && styles.statTilePressed,
      ]}
    >
      <Ionicons name={meta.icon} size={18} color={meta.tint} />
      <Text style={[styles.statValue, isActive && { color: meta.tint }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

function ReportRow({ row }: { row: TreeReportRow }) {
  const meta = STATUS_META[row.status];

  return (
    <View style={[styles.card, row.status === "deleted" && styles.cardDeleted]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <MaterialCommunityIcons
            name="tree"
            size={22}
            color={row.status === "deleted" ? Colors.textMuted : Colors.primary}
          />
        </View>

        <View style={styles.cardHeading}>
          <Text
            style={[styles.cardTitle, row.status === "deleted" && styles.cardTitleDeleted]}
            numberOfLines={1}
          >
            {row.TreeName?.trim() || "Unnamed tree"}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {row.TreeID?.trim() ? row.TreeID : "No Tree ID"}
            {row.TreeDesc?.trim() ? ` · ${row.TreeDesc}` : ""}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: meta.soft }]}>
          <Ionicons name={meta.icon} size={12} color={meta.color} />
          <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailGrid}>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>Scan by</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {row.ScanBy?.trim() || "—"}
          </Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>Scan on</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {formatDateTime(row.ScanOn)}
          </Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {row.Age === null ? "—" : `${row.Age} yr`}
          </Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>Radius</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {row.Radius === null ? "—" : `${row.Radius} m`}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>
          {formatCoords(row.Lattitude, row.Longitude)}
        </Text>
      </View>

      {row.TreeIDGeneratedBy || row.TreeIDGeneratedOn ? (
        <View style={styles.metaRow}>
          <Ionicons name="pricetag-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            ID generated by {row.TreeIDGeneratedBy?.trim() || "—"} on{" "}
            {formatDateTime(row.TreeIDGeneratedOn)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ReportScreen() {
  const contentPadding = useTabBarClearance(100);
  const [rows, setRows] = useState<TreeReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "refresh") setIsRefreshing(true);
    setError(null);
    try {
      const list = await getTreeReport();
      setRows(list.map(toReportRow));
      setIsOffline(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setIsOffline(err.isOffline);
      } else {
        setError("Couldn't load the report. Please try again.");
        setIsOffline(false);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refetched every time the tab is entered: a row's scan state changes on the
  // scan and tree-master screens, so a report left sitting in the background
  // is stale by the time it comes back into view. The first visit shows the
  // full-screen loader; later visits keep the current list on screen and show
  // the pull-to-refresh spinner while the new rows land.
  useFocusEffect(
    useCallback(() => {
      load(hasLoadedOnce.current ? "refresh" : "initial");
      hasLoadedOnce.current = true;
    }, [load])
  );

  const refresh = useCallback(() => load("refresh"), [load]);

  const toggleStatusFilter = useCallback((status: TreeReportStatus) => {
    setFilter((current) => (current === status ? "all" : status));
  }, []);

  const counts = useMemo(
    () => ({
      total: rows.length,
      scanned: rows.filter((row) => row.status === "scanned").length,
      pending: rows.filter((row) => row.status === "pending").length,
      deleted: rows.filter((row) => row.status === "deleted").length,
    }),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows
      .filter((row) => (filter === "all" ? true : row.status === filter))
      .filter((row) => {
        if (!normalized) return true;
        return [row.TreeName, row.TreeID, row.TreeDesc, row.ScanBy].some((field) =>
          field?.toLowerCase().includes(normalized)
        );
      })
      .sort(
        (a, b) =>
          timeValue(b.ScanOn ?? b.TreeIDGeneratedOn) -
          timeValue(a.ScanOn ?? a.TreeIDGeneratedOn)
      );
  }, [rows, query, filter]);

  const renderItem = useCallback(
    ({ item, index }: { item: TreeReportRow; index: number }) => (
      <Animated.View
        entering={FadeInRight.delay(Math.min(index, 8) * 60)
          .duration(320)
          .springify()
          .damping(18)}
      >
        <ReportRow row={item} />
      </Animated.View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <Animated.View entering={FadeInDown.duration(450)}>
            <Text style={styles.headerTitle}>Report</Text>
            <Text style={styles.headerSubtitle}>
              {counts.total} {counts.total === 1 ? "record" : "records"} in the register
            </Text>
          </Animated.View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.85)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, ID or scan by..."
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

      <Animated.View entering={FadeInUp.delay(120).duration(450)} style={styles.statsRow}>
        {STAT_ORDER.map((status) => (
          <StatTile
            key={status}
            status={status}
            value={counts[status]}
            isActive={filter === status}
            onPress={toggleStatusFilter}
          />
        ))}
      </Animated.View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map((item) => {
          const isActive = filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={[styles.banner, isOffline && styles.bannerOffline]}>
          <Ionicons
            name={isOffline ? "cloud-offline-outline" : "alert-circle-outline"}
            size={16}
            color={isOffline ? "#8A5A0A" : Colors.danger}
          />
          <Text style={[styles.bannerText, isOffline && styles.bannerTextOffline]}>
            {isOffline ? "You're offline. Pull down to retry." : error}
          </Text>
          <Pressable onPress={refresh} hitSlop={8}>
            <Ionicons name="refresh" size={16} color={isOffline ? "#8A5A0A" : Colors.danger} />
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Building report...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleRows}
          keyExtractor={(item) => item.ID}
          contentContainerStyle={[styles.listContent, { paddingBottom: contentPadding }]}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          initialNumToRender={8}
          maxToRenderPerBatch={12}
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
                name={query ? "file-search-outline" : "clipboard-text-outline"}
                size={48}
                color={Colors.primaryLight}
              />
              <Text style={styles.emptyTitle}>
                {query ? "No matching records" : "Nothing to report yet"}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? `Nothing matches "${query}". Try a different search.`
                  : "Once Tree IDs are generated and scanned in the field, they'll show up here."}
              </Text>
            </View>
          }
        />
      )}
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "flex-start",
    gap: 2,
  },
  statTilePressed: { opacity: 0.65 },
  statValue: { fontSize: 20, fontWeight: "700", color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  // A horizontal ScrollView defaults to flexGrow/flexShrink: 1, so without
  // flexShrink: 0 the FlatList below squeezes the chip row and clips it.
  filterScroll: { flexGrow: 0, flexShrink: 0, marginTop: 14 },
  filterRow: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12.5, fontWeight: "600", color: Colors.textMuted },
  chipTextActive: { color: "#FFFFFF" },
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
  listContent: { padding: 20, paddingTop: 14, paddingBottom: 100, flexGrow: 1 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardDeleted: { backgroundColor: Colors.background, opacity: 0.85 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeading: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  cardTitleDeleted: { color: Colors.textMuted, textDecorationLine: "line-through" },
  cardSubtitle: { fontSize: 11.5, color: Colors.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 10.5, fontWeight: "700" },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap" },
  detailCell: { width: "50%", marginBottom: 10, paddingRight: 8 },
  detailLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: { fontSize: 13, color: Colors.text, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  metaText: { flex: 1, fontSize: 11.5, color: Colors.textMuted },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: 30,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 12 },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
});
