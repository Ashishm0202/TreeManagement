import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LatLng,
  type Point,
  type Region,
} from "react-native-maps";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { TreeMapTooltip } from "@/components/TreeMapTooltip";
import { Colors } from "@/constants/colors";
import { useTrees } from "@/contexts/TreeContext";
import type { GetTree } from "@/types/tree";

// Strip Google's default points-of-interest layer (malls, restaurants, bus
// stops, ...) so only our own tree markers draw attention on the map.
const MAP_STYLE = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const FALLBACK_REGION: Region = {
  // Roughly the centre of India, used only when no tree has coordinates yet.
  latitude: 22.9734,
  longitude: 78.6569,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

// How many grid cells span the shorter side of the viewport when bucketing
// nearby trees into a cluster — smaller divisions group more aggressively.
const CLUSTER_GRID_DIVISIONS = 25;
// Once a cluster's grid cell would shrink below this (roughly city-block
// scale), stop shrinking it further and instead "spiderfy" — fan the trees
// out individually — since trees this close together will never separate by
// zooming alone (they may share literally the same coordinates).
const MIN_CELL_DEGREES = 0.00008;
const SPIDER_RADIUS_MULTIPLIER = 2.2;
const GOLDEN_ANGLE = 137.508;

type MappedTree = GetTree & { Lattitude: number; Longitude: number };

type ClusterGroup = {
  key: string;
  latitude: number;
  longitude: number;
  trees: MappedTree[];
};

function hasCoordinates(tree: GetTree): tree is MappedTree {
  return (
    tree.DelFlag !== 1 &&
    typeof tree.Lattitude === "number" &&
    typeof tree.Longitude === "number" &&
    !Number.isNaN(tree.Lattitude) &&
    !Number.isNaN(tree.Longitude) &&
    !(tree.Lattitude === 0 && tree.Longitude === 0)
  );
}

function regionFromPoints(
  trees: MappedTree[],
  options?: { minDelta?: number; padding?: number }
): Region {
  if (trees.length === 0) return FALLBACK_REGION;

  const minDelta = options?.minDelta ?? 0.006;
  const padding = options?.padding ?? 1.25;

  let minLat = trees[0].Lattitude;
  let maxLat = trees[0].Lattitude;
  let minLng = trees[0].Longitude;
  let maxLng = trees[0].Longitude;

  for (const tree of trees) {
    minLat = Math.min(minLat, tree.Lattitude);
    maxLat = Math.max(maxLat, tree.Lattitude);
    minLng = Math.min(minLng, tree.Longitude);
    maxLng = Math.max(maxLng, tree.Longitude);
  }

  const latPadding = Math.max((maxLat - minLat) * padding, minDelta);
  const lngPadding = Math.max((maxLng - minLng) * padding, minDelta);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latPadding,
    longitudeDelta: lngPadding,
  };
}

/** Deterministic hash so the same tree always gets the same colour. */
function hashStringToHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * GOLDEN_ANGLE + value.charCodeAt(i)) % 360;
  }
  return hash < 0 ? hash + 360 : hash;
}

function getTreeColor(id: string): string {
  return `hsl(${hashStringToHue(id).toFixed(0)}, 68%, 42%)`;
}

function spiderfyOffset(index: number, total: number, radius: number) {
  const angle = (2 * Math.PI * index) / total;
  return { dLat: radius * Math.sin(angle), dLng: radius * Math.cos(angle) };
}

/**
 * Buckets trees into a coarse lat/lng grid so pins that would otherwise sit
 * on top of one another render as a single badge with a count instead. The
 * grid tightens as the user zooms in (region deltas shrink) so trees that
 * are merely close together separate naturally; `atMaxResolution` flags when
 * the grid has hit its floor, at which point any surviving multi-tree
 * buckets get spiderfied instead of clustered further.
 */
function clusterTrees(trees: MappedTree[], region: Region) {
  const rawCell = Math.max(region.latitudeDelta, region.longitudeDelta) / CLUSTER_GRID_DIVISIONS;
  const atMaxResolution = rawCell <= MIN_CELL_DEGREES;
  const cellSize = Math.max(rawCell, MIN_CELL_DEGREES);

  const buckets = new Map<string, MappedTree[]>();
  for (const tree of trees) {
    const key = `${Math.round(tree.Lattitude / cellSize)}_${Math.round(tree.Longitude / cellSize)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(tree);
    else buckets.set(key, [tree]);
  }

  const groups: ClusterGroup[] = Array.from(buckets.entries()).map(([key, group]) => ({
    key,
    latitude: group.reduce((sum, t) => sum + t.Lattitude, 0) / group.length,
    longitude: group.reduce((sum, t) => sum + t.Longitude, 0) / group.length,
    trees: group,
  }));

  return { groups, atMaxResolution, cellSize };
}

/**
 * Custom pin rendered as a Marker's children. The pulsing halo only animates
 * while selected, so `tracksViewChanges` (which forces the native map to
 * re-snapshot this view every frame — expensive across many markers) is only
 * ever true for the one pin the user tapped.
 */
function TreePin({ selected, color }: { selected: boolean; color: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (selected) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    } else {
      pulse.value = 0;
    }
  }, [selected, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.55,
    transform: [{ scale: 1 + pulse.value * 1.1 }],
  }));

  return (
    <View style={styles.pinWrap}>
      {selected ? (
        <Animated.View style={[styles.pinHalo, haloStyle, { backgroundColor: color }]} />
      ) : null}
      <View
        style={[styles.pinHead, { backgroundColor: color }, selected && styles.pinHeadSelected]}
      >
        <MaterialCommunityIcons name="tree" size={selected ? 20 : 15} color="#FFFFFF" />
      </View>
      <View style={[styles.pinTail, { backgroundColor: color }, selected && styles.pinTailSelected]} />
    </View>
  );
}

/** Badge shown in place of overlapping pins; tapping it zooms in to split them apart. */
function ClusterPin({ count }: { count: number }) {
  return (
    <View style={styles.pinWrap}>
      <View style={styles.clusterHead}>
        <MaterialCommunityIcons name="tree" size={16} color="#FFFFFF" />
        <View style={styles.clusterBadge}>
          <Text style={styles.clusterBadgeText}>{count}</Text>
        </View>
      </View>
      <View style={styles.clusterTail} />
    </View>
  );
}

export default function TreeMapScreen() {
  const { trees, isLoading, error } = useTrees();
  const mapRef = useRef<MapView>(null);
  const [selectedTree, setSelectedTree] = useState<MappedTree | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<LatLng | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<Point | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const hasFitRef = useRef(false);

  const mappedTrees = useMemo(() => trees.filter(hasCoordinates), [trees]);
  const missingCount = trees.length - mappedTrees.length;
  const initialRegion = useMemo(() => regionFromPoints(mappedTrees), [mappedTrees]);
  const [region, setRegion] = useState<Region>(initialRegion);

  const { groups, atMaxResolution, cellSize } = useMemo(
    () => clusterTrees(mappedTrees, region),
    [mappedTrees, region]
  );
  const spiderRadius = cellSize * SPIDER_RADIUS_MULTIPLIER;

  const deselect = () => {
    setSelectedTree(null);
    setSelectedCoordinate(null);
    setAnchorPoint(null);
  };

  // Fits the camera tightly around every plotted tree — a single cluster of
  // trees zooms in close instead of sitting at a wide, mostly-empty default
  // zoom that would need several manual pinches to reach a marker.
  const fitToTrees = (animated: boolean) => {
    if (mappedTrees.length === 0) return;

    if (mappedTrees.length === 1) {
      mapRef.current?.animateToRegion(
        {
          latitude: mappedTrees[0].Lattitude,
          longitude: mappedTrees[0].Longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        animated ? 400 : 0
      );
      return;
    }

    mapRef.current?.fitToCoordinates(
      mappedTrees.map((tree) => ({ latitude: tree.Lattitude, longitude: tree.Longitude })),
      {
        edgePadding: { top: headerHeight + 24, right: 40, bottom: 90, left: 40 },
        animated,
      }
    );
  };

  const recenter = () => {
    deselect();
    fitToTrees(true);
  };

  // `coordinate` is where the pin is actually drawn — which may be a
  // spiderfied offset rather than the tree's true Lattitude/Longitude — so
  // the tooltip anchors to what the user sees, not the raw database value.
  const selectTree = (tree: MappedTree, coordinate: LatLng) => {
    setSelectedTree(tree);
    setSelectedCoordinate(coordinate);
    mapRef.current?.pointForCoordinate(coordinate).then(setAnchorPoint);
  };

  const zoomIntoCluster = (group: ClusterGroup) => {
    const floor = MIN_CELL_DEGREES * CLUSTER_GRID_DIVISIONS;
    mapRef.current?.animateToRegion(
      {
        latitude: group.latitude,
        longitude: group.longitude,
        latitudeDelta: Math.max(region.latitudeDelta / 3, floor),
        longitudeDelta: Math.max(region.longitudeDelta / 3, floor),
      },
      350
    );
  };

  const handleRegionChangeComplete = (nextRegion: Region) => {
    setRegion(nextRegion);
    // Keep the tooltip glued to its marker as the map pans/zooms underneath it.
    if (selectedCoordinate) {
      mapRef.current?.pointForCoordinate(selectedCoordinate).then(setAnchorPoint);
    }
  };

  useEffect(() => {
    if (mapReady && !hasFitRef.current && mappedTrees.length > 0) {
      hasFitRef.current = true;
      fitToTrees(false);
    }
  }, [mapReady, mappedTrees, headerHeight]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.header}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <SafeAreaView edges={["top"]}>
          <Text style={styles.headerTitle}>Tree Map</Text>
          <Text style={styles.headerSubtitle}>
            {mappedTrees.length} {mappedTrees.length === 1 ? "tree" : "trees"} plotted
            {missingCount > 0 ? ` • ${missingCount} without coordinates` : ""}
          </Text>
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading trees...</Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            initialRegion={initialRegion}
            customMapStyle={MAP_STYLE}
            showsPointsOfInterests={false}
            showsIndoors={false}
            onMapReady={() => setMapReady(true)}
            onRegionChangeComplete={handleRegionChangeComplete}
            onPress={deselect}
          >
            {groups.map((group) => {
              if (group.trees.length === 1 || atMaxResolution) {
                return group.trees.map((tree, index) => {
                  const isSelected = selectedTree?.ID === tree.ID;
                  const offset =
                    group.trees.length === 1
                      ? { dLat: 0, dLng: 0 }
                      : spiderfyOffset(index, group.trees.length, spiderRadius);
                  const coordinate = {
                    latitude: group.latitude + offset.dLat,
                    longitude: group.longitude + offset.dLng,
                  };
                  return (
                    <Marker
                      key={tree.ID}
                      coordinate={coordinate}
                      anchor={{ x: 0.5, y: 1 }}
                      tracksViewChanges={isSelected}
                      onPress={(e) => {
                        e.stopPropagation();
                        selectTree(tree, coordinate);
                      }}
                    >
                      <TreePin selected={isSelected} color={getTreeColor(tree.ID)} />
                    </Marker>
                  );
                });
              }

              return (
                <Marker
                  key={group.key}
                  coordinate={{ latitude: group.latitude, longitude: group.longitude }}
                  anchor={{ x: 0.5, y: 1 }}
                  tracksViewChanges={false}
                  onPress={(e) => {
                    e.stopPropagation();
                    zoomIntoCluster(group);
                  }}
                >
                  <ClusterPin count={group.trees.length} />
                </Marker>
              );
            })}
          </MapView>

          <Pressable style={styles.recenterButton} onPress={recenter} hitSlop={8}>
            <Ionicons name="locate" size={20} color={Colors.primary} />
          </Pressable>

          {error ? (
            <View style={styles.banner}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          ) : null}

          <TreeMapTooltip
            tree={selectedTree}
            anchor={anchorPoint}
            topInset={headerHeight}
            onClose={deselect}
          />
        </>
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
    zIndex: 1,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginTop: 8 },
  headerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  pinWrap: { alignItems: "center", justifyContent: "flex-end" },
  pinHalo: {
    position: "absolute",
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  pinHead: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinHeadSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pinTail: {
    width: 9,
    height: 9,
    marginTop: -5,
    borderBottomRightRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  pinTailSelected: {
    marginTop: -6,
  },
  clusterHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  clusterBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  clusterBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  clusterTail: {
    width: 9,
    height: 9,
    marginTop: -5,
    backgroundColor: Colors.primaryDark,
    borderBottomRightRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  recenterButton: {
    position: "absolute",
    right: 18,
    bottom: 24,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  banner: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dangerSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bannerText: { flex: 1, fontSize: 12.5, color: Colors.danger, lineHeight: 17 },
});
