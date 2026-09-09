import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { router, Tabs, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { isGlassTabBar, TAB_BAR_HEIGHT } from "@/constants/liquidGlass";

export default function TabsLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isScanFocused = pathname === "/scan";

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            // The bar's own height/padding are hardcoded, which overrides the
            // inset padding bottom-tabs would otherwise apply — so the bottom
            // safe area (home gesture bar) has to be added back by hand.
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: 10 + insets.bottom,
            paddingTop: 8,
            ...(isGlassTabBar
              ? {
                  // Float the bar so content scrolls beneath the glass, and
                  // let GlassView below supply the whole background — a solid
                  // colour or hairline border would sit on top of the effect.
                  position: "absolute",
                  backgroundColor: "transparent",
                  borderTopWidth: 0,
                }
              : {
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                  backgroundColor: Colors.surface,
                }),
          },
          tabBarBackground: isGlassTabBar
            ? () => (
                <GlassView
                  style={StyleSheet.absoluteFill}
                  glassEffectStyle="regular"
                  // The app is light-themed throughout, so the glass should not
                  // follow the system into dark mode.
                  colorScheme="light"
                />
              )
            : undefined,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tree-master"
          options={{
            title: "Tree Master",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "leaf" : "leaf-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tree-map"
          options={{
            title: "Map",
            // Reached from an icon on the Home and Tree Master screens
            // instead of a tab item. Unlike `scan`'s tabBarButton: () => null
            // below, `href: null` drops it from the tab bar layout entirely
            // rather than leaving an empty flex slot in its place.
            href: null,
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            // Rendered as a floating center button below instead of a
            // normal flex tab item, so it stays truly screen-centered
            // no matter how many tabs are on either side.
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="ReportScreen"
          options={{
            title: "Report",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="generate-id"
          options={{
            title: "Generate ID",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "pricetag" : "pricetag-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      <Pressable
        onPress={() => router.push("/scan")}
        style={[styles.scanButtonWrap, { bottom: SCAN_BUTTON_OFFSET + insets.bottom }]}
        hitSlop={8}
      >
        <View style={[styles.scanButton, isScanFocused && styles.scanButtonFocused]}>
          <Ionicons name="qr-code" size={26} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

const SCAN_BUTTON_OFFSET = 30;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scanButtonWrap: {
    position: "absolute",
    left: "50%",
    marginLeft: -28,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  scanButtonFocused: { backgroundColor: Colors.primaryDark },
});
