import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isGlassTabBar, TAB_BAR_HEIGHT } from "@/constants/liquidGlass";

/**
 * Distance from the bottom of the screen that must be kept clear of the tab
 * bar — use it as scroll content's `paddingBottom`, or as the `bottom` offset
 * of anything floating like a FAB.
 *
 * The glass tab bar is absolutely positioned, so it floats over the screen
 * (that is the whole point of the effect) and React Navigation does not inset
 * screens for it. Off glass the bar occupies layout space and the screen's own
 * `base` offset is already measured from the top of the bar.
 *
 * @param base Offset the screen uses when the bar is not floating.
 */
export function useTabBarClearance(base: number): number {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;
  return isGlassTabBar ? Math.max(base, tabBarHeight + 24) : base;
}
