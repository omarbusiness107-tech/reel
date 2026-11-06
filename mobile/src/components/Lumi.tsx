import React, { useEffect } from "react";
import Svg, { Path, Rect, Ellipse, Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  ReduceMotion,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
export type LumiState =
  | "idle"
  | "greeting"
  | "thinking"
  | "searching"
  | "excited"
  | "curious"
  | "confused"
  | "success"
  | "no-results"
  | "ready";
export function Lumi({
  state = "idle",
  size = 72,
}: {
  state?: LumiState;
  size?: number;
}) {
  const angle = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!reduced && state !== "idle")
      angle.set(
        withSequence(
          withTiming(-7, {
            duration: 140,
            easing: Easing.bezier(0.23, 1, 0.32, 1),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0, { duration: 200, reduceMotion: ReduceMotion.System }),
        ),
      );
  }, [state, reduced, angle]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.get()}deg` }],
  }));
  const happy = ["greeting", "success", "excited", "ready"].includes(state);
  const unsure = ["confused", "no-results"].includes(state);
  return (
    <Animated.View
      style={[{ width: size, height: size }, style]}
      accessible
      accessibilityLabel={`Lumi, ${state}`}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Path
          d="M25 15H78L102 39V87Q102 103 85 103H25Q11 103 11 87V31Q11 15 25 15Z"
          fill="#FF654F"
        />
        <Path d="M78 15V30Q78 39 88 39H102" fill="#FFAA8F" />
        <Rect x="17" y="33" width="7" height="11" rx="2" fill="#F3EFE5" />
        <Rect x="17" y="73" width="7" height="11" rx="2" fill="#F3EFE5" />
        {happy ? (
          <>
            <Path
              d="M39 58Q45 49 51 58M65 58Q71 49 77 58"
              stroke="#191A1D"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <Ellipse
              cx="45"
              cy={state === "curious" ? 53 : 57}
              rx="5"
              ry={unsure ? 4 : 7}
              fill="#191A1D"
            />
            <Ellipse cx="71" cy="57" rx="5" ry="7" fill="#191A1D" />
          </>
        )}
        <Path
          d={
            happy
              ? "M47 74Q58 86 70 72"
              : unsure
                ? "M49 80Q59 72 68 79"
                : "M51 76Q58 81 65 76"
          }
          stroke="#191A1D"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        {["searching", "thinking"].includes(state) ? (
          <>
            <Circle cx="43" cy="92" r="2" fill="#191A1D" />
            <Circle cx="57" cy="92" r="2" fill="#191A1D" />
            <Circle cx="71" cy="92" r="2" fill="#191A1D" />
          </>
        ) : null}
        {["ready", "excited", "success"].includes(state) ? (
          <Path
            d="M108 9L110 17L118 19L110 22L108 30L105 22L97 19L105 17Z"
            fill="#F3EFE5"
          />
        ) : null}
      </Svg>
    </Animated.View>
  );
}
