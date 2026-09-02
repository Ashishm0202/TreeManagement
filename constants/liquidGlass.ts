import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform } from "react-native";

function detectGlassSupport(): { enabled: boolean; reason: string } {
  if (Platform.OS !== "ios") {
    return {
      enabled: false,
      reason: `${Platform.OS} has no Liquid Glass API — GlassView is a plain View here. Using the opaque bar.`,
    };
  }

  let canRenderGlass: boolean;
  try {
    // The same check GlassView makes internally before installing a
    // UIGlassEffect, so it is the honest answer to "will glass actually
    // render?". Deliberately not isLiquidGlassAvailable(), which asks the
    // stricter question of whether the whole app adopted the Liquid Glass
    // design system — that is false wherever Info.plist sets
    // UIDesignRequiresCompatibility (Expo Go, and apps pinned to the legacy
    // look) even though GlassView still renders real glass in those runtimes.
    canRenderGlass = isGlassEffectAPIAvailable();
  } catch {
    return {
      enabled: false,
      reason:
        "expo-glass-effect is not in this binary. Rebuild the app with `npx expo run:ios`, or open it in SDK 54 Expo Go.",
    };
  }

  if (canRenderGlass) {
    const legacyLook = !isLiquidGlassAvailable();
    return {
      enabled: true,
      reason: `glass ON (iOS ${Platform.Version})${
        legacyLook ? " — app is in legacy-look compatibility mode, which does not block GlassView" : ""
      }.`,
    };
  }

  const major = Number.parseInt(String(Platform.Version), 10);
  return {
    enabled: false,
    reason:
      Number.isFinite(major) && major < 26
        ? `iOS ${Platform.Version} predates the Liquid Glass API (needs iOS 26). No JS change can produce the effect here.`
        : `iOS ${Platform.Version} supports Liquid Glass, but this binary was compiled without Xcode 26. Rebuild with Xcode 26.`,
  };
}

const glassSupport = detectGlassSupport();

/**
 * Whether the tab bar should render as Liquid Glass.
 *
 * Off glass, the bar keeps its opaque surface background: `GlassView` degrades
 * to a plain transparent `View`, which would otherwise leave a see-through bar
 * with nothing behind it.
 */
export const isGlassTabBar = glassSupport.enabled;

if (__DEV__) {
  console.log(`[tab bar] ${glassSupport.reason}`);
}
