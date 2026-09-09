import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { Colors } from "@/constants/colors";

const DURATION = 4800;

/**
 * How long the dive into the canopy runs. The root layout animates the app in
 * over the same window, so the two motions read as a single continuous move
 * rather than a splash that stops and a screen that starts.
 */
export const SPLASH_REVEAL_DURATION = 1100;

/* Scene palette — kept out of `Colors` because these are illustration tones,
 * not UI tokens. */
const SKY = ["#BFE3F5", "#D8EEF6", "#EEF7EA", "#F6FAEC"] as const;
const HILL_FAR = "#AFD3BC";
const HILL_NEAR = "#8FC2A1";
const TREELINE = "#6FAE84";
const GRASS_TOP = "#63B87A";
const GRASS_BOTTOM = "#37814E";
const TOPSOIL = "#6B4A2F";
const SOIL_TOP = "#8A5C39";
const SOIL_DEEP = "#4E3220";
const PEBBLE = "#A57B54";
const PEBBLE_DARK = "#3C2617";
const BARK = "#7A4A24";
const BARK_LIGHT = "#A97142";
const BARK_DARK = "#5A3417";
const LEAF_HI = "#7DC98E";

/** Deterministic PRNG so the scatter is stable across renders. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Point on the quadratic curve that forms the front edge of the ground. */
function quadAt(t: number, p0: number, p1: number, p2: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * The seed → fall → germinate → sprout → sapling → tree sequence, driven by one
 * shared `progress` value from 0 to 1. Each element reads its own window out of
 * that timeline with `interpolate`, which keeps the phases in lockstep and
 * tunable from one place — far easier to reason about than a chain of nested
 * callbacks.
 */
export function AnimatedSplash({
  canReveal = true,
  onReveal,
  onFinish,
}: {
  /** The scene holds on its finished frame until this turns true. */
  canReveal?: boolean;
  /** Fired as the dive begins, so the app behind can start easing in. */
  onReveal?: () => void;
  onFinish: () => void;
}) {
  const progress = useSharedValue(0);
  const handoff = useSharedValue(0);
  const [growthDone, setGrowthDone] = useState(false);
  const hasHandedOff = useRef(false);
  const { width: W, height: H } = useWindowDimensions();

  // Every landmark in the scene hangs off these, so the illustration fills any
  // screen without a magic-number layout per device.
  const scene = useMemo(() => {
    const horizonY = H * 0.5;
    const soilY = H * 0.7; // front edge of the grass / top of the soil section
    const bulge = H * 0.022; // how far that edge dips at centre, for depth
    const cx = W / 2;
    const s = Math.min(Math.max(W / 390, 0.85), 1.45);
    return { horizonY, soilY, bulge, cx, s, baseY: soilY + bulge * 0.62 };
  }, [W, H]);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(setGrowthDone)(true);
      }
    );
  }, [progress]);

  // The dive only starts once the tree has finished growing *and* the app
  // behind is ready, so the reveal never lands on an empty frame.
  useEffect(() => {
    if (!growthDone || !canReveal || hasHandedOff.current) return;
    hasHandedOff.current = true;
    onReveal?.();
    handoff.value = withTiming(
      1,
      { duration: SPLASH_REVEAL_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      }
    );
  }, [growthDone, canReveal, handoff, onReveal, onFinish]);

  // Hand off from the native splash only once this overlay has been laid out,
  // otherwise there is a blank frame between the two.
  const handleLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {
      // Already hidden — nothing to do.
    });
  }, []);

  // Covers the seam between the native splash colour and the sky.
  const curtainStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08], [1, 0], Extrapolation.CLAMP),
  }));

  // Two moves on one axis: a slow push-out while the tree grows, then a dive
  // straight into the canopy. Both are anchored on the canopy so the second
  // continues the first instead of cutting to a new camera.
  const sceneStyle = useAnimatedStyle(() => {
    const camera = interpolate(progress.value, [0, 1], [1.1, 1], Extrapolation.CLAMP);
    const dive = interpolate(handoff.value, [0, 1], [1, 9], Extrapolation.CLAMP);
    return { transform: [{ scale: camera * dive }] };
  });

  // The whole overlay dissolves late in the dive, uncovering the app that has
  // been easing forward underneath it.
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(handoff.value, [0.55, 1], [1, 0], Extrapolation.CLAMP),
  }));

  // Blooms to the app's own background colour on the way through, so the dark
  // canopy never cuts straight to a light screen.
  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(handoff.value, [0.2, 0.8], [0, 0.92], Extrapolation.CLAMP),
  }));

  const sunStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.12], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0, 0.35], [H * 0.06, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  const hillsStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.02, 0.14], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0.02, 0.16], [18, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  const groundStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.04, 0.16], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(p, [0.04, 0.18], [H * 0.05, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const cloudAStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.03, 0.16], [0, 0.9], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(p, [0, 1], [-W * 0.06, W * 0.14]) }],
    };
  });

  const cloudBStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.06, 0.2], [0, 0.7], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(p, [0, 1], [W * 0.1, -W * 0.08]) }],
    };
  });

  const seedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.08, 0.13, 0.4, 0.46], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          // Falls in from above the sky, bounces once, then sinks into the soil.
          translateY: interpolate(
            p,
            [0.12, 0.3, 0.335, 0.37, 0.46],
            [-H * 0.62, 0, -H * 0.045, 0, H * 0.02],
            Extrapolation.CLAMP
          ),
        },
        {
          rotate: `${interpolate(p, [0.12, 0.3], [-220, 0], Extrapolation.CLAMP)}deg`,
        },
        {
          scaleX: interpolate(p, [0.29, 0.305, 0.33, 0.36], [1, 1.3, 0.92, 1], Extrapolation.CLAMP),
        },
        {
          scaleY: interpolate(p, [0.29, 0.305, 0.33, 0.36], [1, 0.7, 1.1, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  // Soil gives on impact and settles back into a small mound over the seed.
  const moundStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.16, 0.24], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          scaleX: interpolate(p, [0.29, 0.32, 0.38, 0.5], [1, 1.22, 0.98, 1.04], Extrapolation.CLAMP),
        },
        {
          scaleY: interpolate(p, [0.29, 0.32, 0.38, 0.5], [1, 0.6, 1.12, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const dustStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.295, 0.31, 0.4], [0, 0.85, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(p, [0.295, 0.4], [0.35, 1.8], Extrapolation.CLAMP) },
      ],
    };
  });

  const rootsStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.4, 0.48], [0, 1], Extrapolation.CLAMP),
      transform: [
        { scaleY: interpolate(p, [0.4, 0.62], [0, 1], Extrapolation.CLAMP) },
        { scaleX: interpolate(p, [0.4, 0.62], [0.4, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const sproutStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.42, 0.48, 0.58, 0.63], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(p, [0.44, 0.55, 0.58], [0, 1.08, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const saplingStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.56, 0.62, 0.74, 0.79], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(p, [0.56, 0.7, 0.74], [0.25, 1.06, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const treeStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.72, 0.79], [0, 1], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(p, [0.72, 0.9, 0.95], [0.22, 1.05, 1], Extrapolation.CLAMP) },
        // Settles with a light sway once it has reached full height.
        { rotate: `${interpolate(p, [0.9, 0.95, 1], [0, -1.4, 0], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const h = handoff.value;
    return {
      // Settles in under the tree, then leads the camera out of frame.
      opacity:
        interpolate(p, [0.82, 0.92], [0, 1], Extrapolation.CLAMP) *
        interpolate(h, [0, 0.32], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY:
            interpolate(p, [0.82, 0.92], [16, 0], Extrapolation.CLAMP) +
            interpolate(h, [0, 0.32], [0, -28], Extrapolation.CLAMP),
        },
        { scale: interpolate(h, [0, 0.32], [1, 1.18], Extrapolation.CLAMP) },
      ],
    };
  });

  const { horizonY, soilY, bulge, cx, s, baseY } = scene;
  // Centre of the mature canopy: the point the camera dives through and the
  // point the app grows out of.
  const canopyY = baseY - 228 * s;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} onLayout={handleLayout}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: `${Math.round(cx)}px ${Math.round(canopyY)}px` },
          sceneStyle,
        ]}
      >
        <LinearGradient
          colors={SKY}
          locations={[0, 0.42, 0.78, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.layer, sunStyle]} pointerEvents="none">
          <Sun width={W} height={H} />
        </Animated.View>

        <Animated.View style={[styles.layer, cloudAStyle]} pointerEvents="none">
          <Cloud x={W * 0.14} y={H * 0.14} scale={s * 1.1} />
        </Animated.View>
        <Animated.View style={[styles.layer, cloudBStyle]} pointerEvents="none">
          <Cloud x={W * 0.68} y={H * 0.23} scale={s * 0.75} />
        </Animated.View>

        <Animated.View style={[styles.layer, hillsStyle]} pointerEvents="none">
          <Hills width={W} height={H} horizonY={horizonY} soilY={soilY} />
        </Animated.View>

        <Animated.View style={[styles.layer, groundStyle]} pointerEvents="none">
          <Ground
            width={W}
            height={H}
            horizonY={horizonY}
            soilY={soilY}
            bulge={bulge}
          />
        </Animated.View>

        {/* Roots sit under the soil surface but above the soil fill. */}
        <Animated.View
          style={[
            styles.anchored,
            { left: cx - 90 * s, top: baseY - 4, width: 180 * s, height: 150 * s },
            rootsStyle,
          ]}
          pointerEvents="none"
        >
          <Roots size={s} />
        </Animated.View>

        <Animated.View
          style={[
            styles.anchored,
            { left: cx - 60 * s, top: baseY - 16 * s, width: 120 * s, height: 34 * s },
            moundStyle,
          ]}
          pointerEvents="none"
        >
          <Mound size={s} />
        </Animated.View>

        <Animated.View
          style={[
            styles.anchored,
            { left: cx - 70 * s, top: baseY - 34 * s, width: 140 * s, height: 60 * s },
            dustStyle,
          ]}
          pointerEvents="none"
        >
          <Dust size={s} />
        </Animated.View>

        <Animated.View
          style={[
            styles.anchored,
            { left: cx - 13 * s, top: baseY - 32 * s, width: 26 * s, height: 34 * s },
            seedStyle,
          ]}
          pointerEvents="none"
        >
          <Seed size={s} />
        </Animated.View>

        <Animated.View
          style={[
            styles.grown,
            { left: cx - 45 * s, top: baseY - 88 * s, width: 90 * s, height: 90 * s },
            sproutStyle,
          ]}
          pointerEvents="none"
        >
          <Sprout size={s} />
        </Animated.View>

        <Animated.View
          style={[
            styles.grown,
            { left: cx - 65 * s, top: baseY - 170 * s, width: 130 * s, height: 172 * s },
            saplingStyle,
          ]}
          pointerEvents="none"
        >
          <Sapling size={s} />
        </Animated.View>

        <Animated.View
          style={[
            styles.grown,
            { left: cx - 130 * s, top: baseY - 300 * s, width: 260 * s, height: 302 * s },
            treeStyle,
          ]}
          pointerEvents="none"
        >
          <Tree size={s} />
        </Animated.View>

        <Leaves progress={progress} cx={cx} topY={baseY - 250 * s} size={s} />
      </Animated.View>

      <Animated.View style={[styles.curtain, curtainStyle]} pointerEvents="none" />
      <Animated.View style={[styles.wash, washStyle]} pointerEvents="none" />

      <LeafBurst handoff={handoff} cx={cx} cy={canopyY} size={s} />

      <Animated.View
        style={[styles.titleWrap, { top: soilY + (H - soilY) * 0.55 }, titleStyle]}
      >
        <Text style={styles.title}>Tree Management</Text>
        <Text style={styles.subtitle}>Every tree has a place</Text>
      </Animated.View>
    </Animated.View>
  );
}

function Sun({ width, height }: { width: number; height: number }) {
  const cx = width * 0.78;
  const cy = height * 0.14;
  const r = Math.min(width, height) * 0.07;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF3C4" stopOpacity={0.95} />
          <Stop offset="0.45" stopColor="#FFE9A8" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#FFE9A8" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r * 4} fill="url(#glow)" />
      <Circle cx={cx} cy={cy} r={r} fill="#FFF6D6" />
      <Circle cx={cx} cy={cy} r={r * 0.78} fill="#FFF9E8" />
    </Svg>
  );
}

function Cloud({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <Svg width={160 * scale} height={60 * scale} style={{ position: "absolute", left: x, top: y }} viewBox="0 0 160 60">
      <G fill="#FFFFFF" opacity={0.92}>
        <Ellipse cx={48} cy={36} rx={34} ry={20} />
        <Ellipse cx={82} cy={28} rx={30} ry={22} />
        <Ellipse cx={112} cy={38} rx={28} ry={17} />
        <Rect x={20} y={38} width={110} height={16} rx={8} />
      </G>
    </Svg>
  );
}

function Hills({
  width,
  height,
  horizonY,
  soilY,
}: {
  width: number;
  height: number;
  horizonY: number;
  soilY: number;
}) {
  const W = width;
  const far = `M0 ${horizonY} C ${W * 0.14} ${horizonY - height * 0.075}, ${W * 0.3} ${horizonY - height * 0.01}, ${W * 0.46} ${horizonY - height * 0.035} S ${W * 0.82} ${horizonY - height * 0.09}, ${W} ${horizonY - height * 0.02} L ${W} ${soilY} L 0 ${soilY} Z`;
  const near = `M0 ${horizonY + height * 0.012} C ${W * 0.2} ${horizonY - height * 0.03}, ${W * 0.4} ${horizonY + height * 0.02}, ${W * 0.62} ${horizonY - height * 0.005} S ${W * 0.9} ${horizonY - height * 0.045}, ${W} ${horizonY + height * 0.005} L ${W} ${soilY} L 0 ${soilY} Z`;

  // Background treeline standing on the far ridge.
  const next = rand(7);
  const trees = Array.from({ length: 16 }, (_, i) => {
    const tx = (i + 0.5) * (W / 16) + (next() - 0.5) * (W / 22);
    const th = height * (0.026 + next() * 0.024);
    const ty = horizonY + height * 0.004;
    return { tx, th, ty, round: next() > 0.45 };
  });

  return (
    <Svg width={width} height={height}>
      <Path d={far} fill={HILL_FAR} />
      <G opacity={0.95}>
        {trees.map((t, i) => (
          <G key={i}>
            {t.round ? (
              <>
                <Rect x={t.tx - t.th * 0.05} y={t.ty - t.th * 0.35} width={t.th * 0.1} height={t.th * 0.4} fill={TREELINE} />
                <Circle cx={t.tx} cy={t.ty - t.th * 0.55} r={t.th * 0.38} fill={TREELINE} />
              </>
            ) : (
              <Path
                d={`M${t.tx} ${t.ty - t.th} L${t.tx + t.th * 0.3} ${t.ty} L${t.tx - t.th * 0.3} ${t.ty} Z`}
                fill={TREELINE}
              />
            )}
          </G>
        ))}
      </G>
      <Path d={near} fill={HILL_NEAR} />
    </Svg>
  );
}

function Ground({
  width,
  height,
  horizonY,
  soilY,
  bulge,
}: {
  width: number;
  height: number;
  horizonY: number;
  soilY: number;
  bulge: number;
}) {
  const W = width;
  // Both the grass and the soil section share this front edge, so the ground
  // reads as one solid slab cut open towards the viewer.
  const ctrlY = soilY + bulge * 2;
  const edge = `Q ${W / 2} ${ctrlY} ${W} ${soilY}`;
  const grass = `M0 ${horizonY} L ${W} ${horizonY} L ${W} ${soilY} ${`Q ${W / 2} ${ctrlY} 0 ${soilY}`} Z`;
  const soil = `M0 ${soilY} ${edge} L ${W} ${height} L 0 ${height} Z`;

  const next = rand(19);
  const blades = Array.from({ length: 46 }, (_, i) => {
    const t = (i + 0.5) / 46;
    const bx = t * W;
    const by = quadAt(t, soilY, ctrlY, soilY);
    const bh = height * (0.012 + next() * 0.016);
    const lean = (next() - 0.5) * bh * 0.9;
    return { bx, by, bh, lean };
  });

  const pebbles = Array.from({ length: 26 }, () => {
    const px = next() * W;
    const py = soilY + bulge + next() * (height - soilY);
    const pr = 2 + next() * 5;
    return { px, py, pr, dark: next() > 0.55 };
  });

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GRASS_TOP} />
          <Stop offset="1" stopColor={GRASS_BOTTOM} />
        </SvgLinearGradient>
        <SvgLinearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={SOIL_TOP} />
          <Stop offset="0.55" stopColor="#63401F" />
          <Stop offset="1" stopColor={SOIL_DEEP} />
        </SvgLinearGradient>
      </Defs>

      <Path d={grass} fill="url(#grass)" />
      {/* Haze where the field meets the hills. */}
      <Rect x={0} y={horizonY} width={W} height={height * 0.03} fill="#8FD09F" opacity={0.35} />

      <Path d={soil} fill="url(#soil)" />
      {/* Dark crumb layer directly under the turf. */}
      <Path
        d={`M0 ${soilY} ${edge} L ${W} ${soilY + height * 0.022} ${`Q ${W / 2} ${ctrlY + height * 0.022} 0 ${soilY + height * 0.022}`} Z`}
        fill={TOPSOIL}
      />

      {pebbles.map((p, i) => (
        <Ellipse
          key={i}
          cx={p.px}
          cy={p.py}
          rx={p.pr}
          ry={p.pr * 0.72}
          fill={p.dark ? PEBBLE_DARK : PEBBLE}
          opacity={p.dark ? 0.35 : 0.45}
        />
      ))}

      {blades.map((b, i) => (
        <Path
          key={i}
          d={`M${b.bx} ${b.by + 2} Q ${b.bx + b.lean * 0.5} ${b.by - b.bh * 0.6} ${b.bx + b.lean} ${b.by - b.bh}`}
          stroke={i % 3 === 0 ? Colors.primaryLight : Colors.primary}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

function Mound({ size }: { size: number }) {
  return (
    <Svg width={120 * size} height={34 * size} viewBox="0 0 120 34">
      <Ellipse cx={60} cy={22} rx={44} ry={12} fill={TOPSOIL} opacity={0.9} />
      <Path d="M22 22 Q 60 2 98 22 Z" fill={SOIL_TOP} />
      <Ellipse cx={44} cy={17} rx={4} ry={2.4} fill={PEBBLE} opacity={0.6} />
      <Ellipse cx={72} cy={19} rx={3} ry={2} fill={PEBBLE} opacity={0.5} />
    </Svg>
  );
}

function Dust({ size }: { size: number }) {
  const next = rand(31);
  const puffs = Array.from({ length: 9 }, () => ({
    x: 20 + next() * 100,
    y: 30 + next() * 22,
    r: 3 + next() * 7,
  }));
  return (
    <Svg width={140 * size} height={60 * size} viewBox="0 0 140 60">
      {puffs.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={PEBBLE} opacity={0.5} />
      ))}
    </Svg>
  );
}

function Seed({ size }: { size: number }) {
  return (
    <Svg width={26 * size} height={34 * size} viewBox="0 0 26 34">
      <Defs>
        <SvgLinearGradient id="seedFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BARK_LIGHT} />
          <Stop offset="1" stopColor={BARK_DARK} />
        </SvgLinearGradient>
      </Defs>
      <Ellipse cx={13} cy={18} rx={10} ry={15} fill="url(#seedFill)" />
      <Path d="M13 4 Q 5 14 8 30" stroke={BARK_DARK} strokeWidth={1.2} fill="none" opacity={0.5} />
      <Ellipse cx={9.5} cy={12} rx={3} ry={5} fill="#C6975F" opacity={0.8} />
    </Svg>
  );
}

function Roots({ size }: { size: number }) {
  return (
    <Svg width={180 * size} height={150 * size} viewBox="0 0 180 150">
      <G stroke="#C8A377" fill="none" strokeLinecap="round" opacity={0.95}>
        <Path d="M90 0 C 90 30 88 60 86 92" strokeWidth={6} />
        <Path d="M89 22 C 70 38 58 52 46 74" strokeWidth={4} />
        <Path d="M90 30 C 110 46 124 60 134 84" strokeWidth={4} />
        <Path d="M87 58 C 74 74 68 86 64 104" strokeWidth={3} />
        <Path d="M89 66 C 102 82 108 94 112 112" strokeWidth={3} />
        <Path d="M46 74 C 38 84 34 92 32 102" strokeWidth={2} />
        <Path d="M134 84 C 142 92 146 100 148 110" strokeWidth={2} />
        <Path d="M86 92 C 84 108 82 118 80 130" strokeWidth={2.5} />
      </G>
    </Svg>
  );
}

function Sprout({ size }: { size: number }) {
  return (
    <Svg width={90 * size} height={90 * size} viewBox="0 0 90 90">
      <Path d="M45 90 C 45 70 45 58 45 46" stroke={Colors.primary} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M45 60 C 26 60 14 48 16 34 C 34 32 45 45 45 60 Z" fill={Colors.primaryLight} />
      <Path d="M45 54 C 64 54 76 42 74 28 C 56 26 45 39 45 54 Z" fill={Colors.primary} />
      <Path d="M30 48 C 36 50 41 54 45 59" stroke={Colors.primaryDark} strokeWidth={1.4} fill="none" opacity={0.5} />
      <Path d="M60 42 C 54 44 49 48 45 53" stroke={Colors.primaryDark} strokeWidth={1.4} fill="none" opacity={0.5} />
    </Svg>
  );
}

function Sapling({ size }: { size: number }) {
  return (
    <Svg width={130 * size} height={172 * size} viewBox="0 0 130 172">
      <Path
        d="M61 172 C 61 130 62 106 65 76 C 66 66 66 58 65 50 L 69 50 C 70 60 70 68 69 78 C 67 108 67 132 68 172 Z"
        fill={BARK}
      />
      <Path d="M65 96 L 40 78" stroke={BARK} strokeWidth={4} strokeLinecap="round" />
      <Path d="M66 84 L 92 66" stroke={BARK} strokeWidth={4} strokeLinecap="round" />
      <Path d="M40 78 C 20 78 10 66 12 52 C 32 50 41 62 40 78 Z" fill={Colors.primaryLight} />
      <Path d="M92 66 C 112 66 122 54 120 40 C 100 38 91 50 92 66 Z" fill={Colors.primary} />
      <Path d="M65 50 C 45 46 36 32 40 18 C 60 18 68 34 65 50 Z" fill={Colors.primaryDark} />
      <Path d="M67 48 C 87 44 96 30 92 16 C 72 16 64 32 67 48 Z" fill={Colors.primary} />
      <Circle cx={66} cy={40} r={4} fill={LEAF_HI} opacity={0.6} />
    </Svg>
  );
}

function Tree({ size }: { size: number }) {
  return (
    <Svg width={260 * size} height={302 * size} viewBox="0 0 260 302">
      <Defs>
        <SvgLinearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={BARK_DARK} />
          <Stop offset="0.45" stopColor={BARK_LIGHT} />
          <Stop offset="1" stopColor={BARK} />
        </SvgLinearGradient>
        <RadialGradient id="canopy" cx="38%" cy="30%" r="75%">
          <Stop offset="0" stopColor={LEAF_HI} />
          <Stop offset="0.55" stopColor={Colors.primary} />
          <Stop offset="1" stopColor={Colors.primaryDark} />
        </RadialGradient>
      </Defs>

      {/* Root flare into trunk, then a tapering bole. */}
      <Path
        d="M104 302 C 108 268 116 246 118 208 C 119 186 118 168 116 150 L 146 150 C 144 170 143 188 144 210 C 146 248 152 270 156 302 Z"
        fill="url(#trunk)"
      />
      <Path d="M118 210 C 124 240 126 268 126 302" stroke={BARK_DARK} strokeWidth={2} fill="none" opacity={0.35} />
      <Path d="M136 200 C 140 236 142 268 142 302" stroke={BARK_DARK} strokeWidth={2} fill="none" opacity={0.25} />

      <G stroke={BARK} strokeLinecap="round" fill="none">
        <Path d="M124 178 C 104 166 90 152 78 132" strokeWidth={11} />
        <Path d="M138 172 C 158 160 174 148 188 128" strokeWidth={11} />
        <Path d="M128 148 C 120 128 116 112 114 96" strokeWidth={9} />
        <Path d="M136 146 C 148 128 156 116 164 104" strokeWidth={8} />
        <Path d="M84 138 C 74 128 68 120 62 110" strokeWidth={6} />
        <Path d="M182 134 C 192 124 198 116 204 106" strokeWidth={6} />
      </G>

      {/* Canopy: broad mass first, then rims and highlights for volume. */}
      <G>
        <Ellipse cx={70} cy={116} rx={54} ry={44} fill={Colors.primaryDark} />
        <Ellipse cx={192} cy={116} rx={52} ry={42} fill={Colors.primaryDark} />
        <Ellipse cx={130} cy={122} rx={78} ry={52} fill={Colors.primary} />
        <Ellipse cx={130} cy={72} rx={86} ry={62} fill="url(#canopy)" />
        <Ellipse cx={78} cy={86} rx={48} ry={40} fill={Colors.primary} />
        <Ellipse cx={186} cy={88} rx={46} ry={38} fill={Colors.primaryDark} opacity={0.85} />
        <Ellipse cx={104} cy={52} rx={40} ry={32} fill={Colors.primaryLight} opacity={0.9} />
        <Ellipse cx={150} cy={44} rx={34} ry={26} fill={LEAF_HI} opacity={0.7} />
        <Circle cx={96} cy={40} r={16} fill={LEAF_HI} opacity={0.55} />
        <Circle cx={62} cy={100} r={13} fill={Colors.primaryLight} opacity={0.45} />
        <Circle cx={196} cy={130} r={12} fill={Colors.primaryDark} opacity={0.5} />
      </G>

      {/* Ground shadow the trunk sits in. */}
      <Ellipse cx={130} cy={300} rx={78} ry={12} fill={SOIL_DEEP} opacity={0.18} />
    </Svg>
  );
}

/** Leaves that drift off the canopy once the tree has filled out. */
function Leaves({
  progress,
  cx,
  topY,
  size,
}: {
  progress: { value: number };
  cx: number;
  topY: number;
  size: number;
}) {
  const specs = useMemo(() => {
    const next = rand(53);
    return Array.from({ length: 7 }, () => ({
      x: (next() - 0.5) * 220 * size,
      delay: 0.78 + next() * 0.1,
      drift: (next() - 0.5) * 90 * size,
      fall: (120 + next() * 130) * size,
      spin: 180 + next() * 360,
      light: next() > 0.5,
    }));
  }, [size]);

  return (
    <>
      {specs.map((leaf, i) => (
        <Leaf key={i} progress={progress} leaf={leaf} cx={cx} topY={topY} size={size} />
      ))}
    </>
  );
}

function Leaf({
  progress,
  leaf,
  cx,
  topY,
  size,
}: {
  progress: { value: number };
  leaf: { x: number; delay: number; drift: number; fall: number; spin: number; light: boolean };
  cx: number;
  topY: number;
  size: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const a = leaf.delay;
    const b = 1;
    return {
      opacity: interpolate(p, [a, a + 0.05, b - 0.06, b], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [a, b], [0, leaf.fall], Extrapolation.CLAMP) },
        { translateX: interpolate(p, [a, b], [0, leaf.drift], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [a, b], [0, leaf.spin], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.anchored,
        { left: cx + leaf.x, top: topY, width: 16 * size, height: 12 * size },
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={16 * size} height={12 * size} viewBox="0 0 16 12">
        <Path
          d="M1 6 C 5 0 12 0 15 3 C 12 10 5 12 1 6 Z"
          fill={leaf.light ? LEAF_HI : Colors.primary}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * The canopy coming apart as the camera passes through it — the visual excuse
 * for the scene ending, and the cue that something else is behind it.
 */
function LeafBurst({
  handoff,
  cx,
  cy,
  size,
}: {
  handoff: { value: number };
  cx: number;
  cy: number;
  size: number;
}) {
  const specs = useMemo(() => {
    const next = rand(97);
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + (next() - 0.5) * 0.5;
      const reach = (170 + next() * 260) * size;
      return {
        dx: Math.cos(angle) * reach,
        dy: Math.sin(angle) * reach - 30 * size,
        spin: (next() - 0.5) * 720,
        grow: 0.9 + next() * 1.2,
        light: next() > 0.5,
      };
    });
  }, [size]);

  return (
    <>
      {specs.map((leaf, i) => (
        <BurstLeaf key={i} handoff={handoff} leaf={leaf} cx={cx} cy={cy} size={size} />
      ))}
    </>
  );
}

function BurstLeaf({
  handoff,
  leaf,
  cx,
  cy,
  size,
}: {
  handoff: { value: number };
  leaf: { dx: number; dy: number; spin: number; grow: number; light: boolean };
  cx: number;
  cy: number;
  size: number;
}) {
  const style = useAnimatedStyle(() => {
    const h = handoff.value;
    return {
      opacity: interpolate(h, [0, 0.06, 0.62, 0.9], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(h, [0, 0.9], [0, leaf.dx], Extrapolation.CLAMP) },
        { translateY: interpolate(h, [0, 0.9], [0, leaf.dy], Extrapolation.CLAMP) },
        { rotate: `${interpolate(h, [0, 0.9], [0, leaf.spin], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(h, [0, 0.9], [leaf.grow * 0.5, leaf.grow * 1.7], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.anchored, { left: cx - 9 * size, top: cy - 7 * size }, style]}
      pointerEvents="none"
    >
      <Svg width={18 * size} height={14 * size} viewBox="0 0 16 12">
        <Path
          d="M1 6 C 5 0 12 0 15 3 C 12 10 5 12 1 6 Z"
          fill={leaf.light ? LEAF_HI : Colors.primary}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.background,
    zIndex: 100,
    overflow: "hidden",
  },
  curtain: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.background,
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.background,
  },
  layer: { ...StyleSheet.absoluteFill },
  anchored: { position: "absolute" },
  // Anchored at the soil line so everything grows up out of the ground rather
  // than scaling outward from its own centre.
  grown: { position: "absolute", transformOrigin: "bottom center" },
  titleWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#F2E6D6",
    marginTop: 6,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
