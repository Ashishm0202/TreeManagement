import { Ionicons } from "@expo/vector-icons";
import { router, Tabs, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";

export default function TabsLayout() {
  const pathname = usePathname();
  const isScanFocused = pathname === "/scan";

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            backgroundColor: Colors.surface,
          },
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
          name="scan"
          options={{
            // Rendered as a floating center button below instead of a
            // normal flex tab item, so it stays truly screen-centered
            // no matter how many tabs are on either side.
            tabBarButton: () => null,
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
        style={styles.scanButtonWrap}
        hitSlop={8}
      >
        <View style={[styles.scanButton, isScanFocused && styles.scanButtonFocused]}>
          <Ionicons name="qr-code" size={26} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scanButtonWrap: {
    position: "absolute",
    bottom: 30,
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
