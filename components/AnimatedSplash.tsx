import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import { Colors } from "@/constants/colors";

const DURATION = 4200;

/** Stage the scene is composed in. Everything is positioned against GROUND_Y. */
const STAGE_W = 260;
const STAGE_H = 340;
const GROUND_Y = 248;

const SOIL = "#E7DBC7";
const BARK = "#8B5A2B";
const BARK_LIGHT = "#A97142";

/**
 * The seed → fall → germinate → grow sequence, driven by one shared `progress`
 * value from 0 to 1. Each element reads its own window out of that timeline
 * with `interpolate`, which keeps the phases in lockstep and tunable from one
 * place — far easier to reason about than a chain of nested callbacks.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      }
    );
  }, [progress, onFinish]);

  // Hand off from the native splash only once this overlay has been laid out,
  // otherwise there is a blank frame between the two.
  const handleLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {
      // Already hidden — nothing to do.
    });
  }, []);

  const groundStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.02, 0.12], [0, 1], Extrapolation.CLAMP),
      transform: [
        { scaleX: interpolate(p, [0.02, 0.14], [0.7, 1], Extrapolation.CLAMP) },
        // Soil gives a little on impact.
        {
          scaleY: interpolate(
            p,
            [0.29, 0.32, 0.37],
            [1, 1.14, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const seedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.06, 0.4, 0.48], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          // Appears high, falls, bounces once, then sinks into the soil.
          translateY: interpolate(
            p,
            [0.1, 0.3, 0.34, 0.38, 0.48],
            [-200, 0, -22, 0, 12],
            Extrapolation.CLAMP
          ),
        },
        {
          scaleX: interpolate(
            p,
            [0.28, 0.3, 0.33, 0.36],
            [1, 1.25, 0.94, 1],
            Extrapolation.CLAMP
          ),
        },
        {
          scaleY: interpolate(
            p,
            [0.28, 0.3, 0.33, 0.36],
            [1, 0.72, 1.08, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const sproutStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.38, 0.44, 0.64, 0.72], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(
            p,
            [0.4, 0.56, 0.62],
            [0, 1.06, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const treeStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.6, 0.68], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(
            p,
            [0.6, 0.84, 0.9],
            [0.12, 1.05, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.86, 0.96], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0.86, 0.96], [14, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      style={styles.overlay}
      onLayout={handleLayout}
      exiting={FadeOut.duration(450)}
    >
      <View style={styles.stage}>
        <Animated.View style={[styles.ground, groundStyle]}>
          <Svg width={240} height={70} viewBox="0 0 240 70">
            <Ellipse cx={120} cy={36} rx={118} ry={30} fill={SOIL} />
            <Ellipse cx={120} cy={30} rx={112} ry={24} fill={Colors.primarySoft} />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.tree, treeStyle]}>
          <Svg width={180} height={200} viewBox="0 0 180 200">
            <Path
              d="M84 200 L84 122 Q84 110 90 102 Q96 110 96 122 L96 200 Z"
              fill={BARK}
            />
            <Path
              d="M90 142 L68 120"
              stroke={BARK}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <Path
              d="M90 152 L112 130"
              stroke={BARK}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <Circle cx={56} cy={96} r={32} fill={Colors.primaryLight} />
            <Circle cx={124} cy={96} r={32} fill={Colors.primaryDark} />
            <Circle cx={90} cy={68} r={44} fill={Colors.primary} />
            <Circle cx={90} cy={104} r={30} fill={Colors.primary} />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.sprout, sproutStyle]}>
          <Svg width={80} height={90} viewBox="0 0 80 90">
            <Path
              d="M40 90 L40 44"
              stroke={Colors.primary}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <Path
              d="M40 58 C 22 58 12 46 14 34 C 30 32 40 44 40 58 Z"
              fill={Colors.primaryLight}
            />
            <Path
              d="M40 52 C 58 52 68 40 66 28 C 50 26 40 38 40 52 Z"
              fill={Colors.primary}
            />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.seed, seedStyle]}>
          <Svg width={26} height={34} viewBox="0 0 26 34">
            <Ellipse cx={13} cy={17} rx={11} ry={16} fill={BARK} />
            <Ellipse cx={9} cy={12} rx={3.5} ry={6} fill={BARK_LIGHT} />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.titleWrap, titleStyle]}>
          <Text style={styles.title}>Tree Management</Text>
          <Text style={styles.subtitle}>Every tree has a place</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  stage: { width: STAGE_W, height: STAGE_H },
  ground: {
    position: "absolute",
    left: (STAGE_W - 240) / 2,
    top: GROUND_Y - 36,
  },
  // Sprout and tree are anchored so they grow up out of the soil rather than
  // scaling outward from their own centre.
  sprout: {
    position: "absolute",
    left: (STAGE_W - 80) / 2,
    top: GROUND_Y - 90,
    transformOrigin: "bottom center",
  },
  tree: {
    position: "absolute",
    left: (STAGE_W - 180) / 2,
    top: GROUND_Y - 200,
    transformOrigin: "bottom center",
  },
  seed: {
    position: "absolute",
    left: (STAGE_W - 26) / 2,
    top: GROUND_Y - 38,
  },
  titleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: GROUND_Y + 44,
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
